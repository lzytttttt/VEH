import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';
import { parseSSE, extractDeltaText, createAbortController, buildChatCompletionsURL } from './sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';

/**
 * OpenAI 兼容 VLM Adapter（参考实现）
 *
 * 适用于 OpenAI GPT-4o、Azure OpenAI、vLLM 本地部署等所有 OpenAI 兼容服务。
 * 配置从 apiConfigStore 的 'vlm' 条目懒读取（调用时取最新），因此注册中心
 * 缓存的实例也能反映面板里改后的 baseURL/apiKey/model。
 *
 * 生产环境建议走后端代理 /api/llm/*，由后端注入 apiKey。
 */
export class OpenAIAdapter implements VLMProvider {
  readonly name = 'OpenAI Compatible VLM Adapter';

  private controllers = new Map<string, AbortController>();

  /** 调用时懒读取最新配置（非构造时），避免脏缓存 */
  private cfg() {
    const c = getProviderConfig('vlm');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey || '',
      model: c.model || 'deepseek-v4-flash',
    };
  }

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    const sessionId = `${input.scenario}-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();

    try {
      // 1. 组装多模态 prompt
      const messages = this.buildMessages(input);

      // 2. 调用 OpenAI 兼容流式接口
      const resp = await fetch(buildChatCompletionsURL(baseURL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`VLM API ${resp.status}: ${await resp.text()}`);
      }

      // 3. 解析 SSE，把 token 累积成 AnalysisChunk yield
      let textBuffer = '';
      let currentT = input.startFrom ?? 0;

      for await (const chunk of parseSSE(resp, controller.signal)) {
        const token = extractDeltaText(chunk);
        if (!token) continue;

        textBuffer += token;

        // 简化策略：遇到换行就把累积文本作为 text chunk yield
        // 进阶：可要求 LLM 输出 JSON Lines，按 type 解析为不同 chunk
        if (textBuffer.includes('\n')) {
          const lines = textBuffer.split('\n');
          textBuffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const parsed = this.tryParseChunkLine(trimmed, currentT);
            if (parsed) {
              if (parsed.timestamp != null) currentT = parsed.timestamp;
              yield parsed;
            } else {
              yield { type: 'text', content: trimmed, timestamp: currentT };
            }
          }
        }
      }

      // flush 剩余
      if (textBuffer.trim()) {
        yield { type: 'text', content: textBuffer.trim(), timestamp: currentT };
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  /** 尝试把一行解析为结构化 AnalysisChunk（LLM 按 system prompt 约束输出 JSON 时生效） */
  private tryParseChunkLine(line: string, fallbackT: number): AnalysisChunk | null {
    if (!(line.startsWith('{') && line.endsWith('}'))) return null;
    try {
      const obj = JSON.parse(line) as Partial<AnalysisChunk>;
      if (!obj.type || !obj.content) return null;
      return {
        type: obj.type,
        content: obj.content,
        timestamp: obj.timestamp ?? fallbackT,
        confidence: obj.confidence,
        label: obj.label,
        studentId: obj.studentId,
        wikiNodeId: obj.wikiNodeId,
      };
    } catch {
      return null;
    }
  }

  /** 组装多模态 messages：system + 用户消息（含帧描述/转录） */
  private buildMessages(input: AnalysisInput) {
    const sceneDesc = input.frames
      .map((f) => `[t=${f.t}s] ${f.snapshot}`)
      .join('\n');
    const transcript = input.transcript
      .map((t) => `[t=${t.t}s][${t.speaker}] ${t.text}`)
      .join('\n');

    return [
      {
        role: 'system',
        content: `你是一位课堂观察专家。根据课堂画面描述与转录，按时间线流式产出分析。
输出要求：每行一条分析，格式为 JSON：{"type":"text|event|metric","content":"...","timestamp":N}
type 取值：text(分析文本)/event(关键事件)/metric(指标快照)。`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `场景：${input.scenario}\n\n画面帧：\n${sceneDesc}\n\n转录：\n${transcript}`,
          },
          // 如果有真实课堂图片，可加 image_url：
          // { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } },
        ],
      },
    ];
  }

  cancel(sessionId: string): void {
    const controller = this.controllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.controllers.delete(sessionId);
    }
  }
}
