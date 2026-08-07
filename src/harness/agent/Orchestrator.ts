import type {
  AgentEvent,
  AgentOrchestrator,
  AgentTask,
  OrchestratorConfig,
  ToolDefinition,
  ToolRegistry,
} from './types';
import {
  accumulateToolCalls,
  buildChatCompletionsURL,
  extractDeltaText,
  extractFinishReason,
  extractToolCalls,
  parseSSE,
  withTimeout,
  type ChatMessage,
  type ChatToolCall,
} from '../adapters/sseUtils';

const DEFAULT_MAX_STEPS = 8;
const DEFAULT_TIMEOUT_MS = 60_000;

/** Plan-JSON 降级路径解析出的单步 */
interface PlanStep {
  tool: string;
  args: Record<string, unknown>;
}

/** 单次 LLM 调用的累积结果 */
interface LLMResult {
  text: string;
  toolCalls: ChatToolCall[];
  finishReason: string | null;
}

/**
 * Agent 编排内核（真实实现）
 *
 * 双路径工具调用：
 * 1. 优先 — 原生 function-calling：请求体带 tools，解析 delta.tool_calls
 * 2. 降级 — 自解析 Plan-JSON：模型不返回 tool_calls 时，尝试把文本解析为
 *    {steps:[{tool,args}]} 并按计划执行
 *
 * 不做显式"探测"：每次都带 tools 发请求，根据响应里是否有 tool_calls 自动分流。
 * 这样对支持/不支持的模型都工作，无需额外往返。
 *
 * 自管 fetch 循环（镜像 OpenAIAdapter 模式），复用 sseUtils 的 parseSSE /
 * extractDeltaText / extractToolCalls，**不修改 streamChatCompletion**，
 * 保证现有 4 个流式消费方零回归。
 */
export class Orchestrator implements AgentOrchestrator {
  readonly name = 'AgentOrchestrator';
  private controllers = new Map<string, AbortController>();

  constructor(
    private readonly registry: ToolRegistry,
    private readonly getConfig: () => OrchestratorConfig,
  ) {}

  async *run(task: AgentTask): AsyncIterable<AgentEvent> {
    const sessionId = `agent-${Date.now()}`;
    const controller = new AbortController();
    this.controllers.set(sessionId, controller);

    const cfg = this.getConfig();
    const maxSteps = task.maxSteps ?? cfg.maxSteps ?? DEFAULT_MAX_STEPS;
    const timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const allTools = this.registry.list();
    const tools = task.tools
      ? allTools.filter((t) => task.tools!.includes(t.name))
      : allTools;

    const messages: ChatMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(task, tools) },
      { role: 'user', content: this.buildUserMessage(task) },
    ];

    yield {
      type: 'plan',
      content: `已加载 ${tools.length} 个工具：${tools.map((t) => t.name).join('、') || '（无）'}。开始规划。`,
      stepIndex: 0,
    };

    try {
      let step = 0;
      let usedAnyTool = false;

      while (step < maxSteps) {
        step++;
        let result: LLMResult;
        try {
          result = await this.callLLM(messages, tools, controller.signal, timeoutMs);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (e instanceof DOMException && e.name === 'AbortError') {
            yield { type: 'error', error: '已取消', stepIndex: step };
          } else {
            yield { type: 'error', error: `LLM 调用失败：${msg}`, stepIndex: step };
          }
          return;
        }

        // 记录 assistant 消息（含 tool_calls 便于多轮）
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.text || '',
          ...(result.toolCalls.length ? { tool_calls: result.toolCalls } : {}),
        };
        messages.push(assistantMsg);

        // —— 路径 1：原生 function-calling ——
        if (result.toolCalls.length > 0) {
          usedAnyTool = true;
          for (const tc of result.toolCalls) {
            const args = this.safeParseArgs(tc.function.arguments);
            yield { type: 'tool_call', toolName: tc.function.name, toolArgs: args, stepIndex: step };
            const toolResult = await this.executeTool(tc.function.name, args, tools, controller.signal);
            // 回灌 tool 角色消息（OpenAI 要求 tool_call_id 对齐）
            messages.push({
              role: 'tool',
              content: this.stringifyResult(toolResult.value),
              tool_call_id: tc.id,
            });
            yield {
              type: 'tool_result',
              toolName: tc.function.name,
              toolResult: toolResult.value,
              stepIndex: step,
              elapsedMs: toolResult.elapsedMs,
            };
          }
          continue; // 继续下一轮，让 LLM 决定是否再调工具或收尾
        }

        // —— 路径 2：降级 Plan-JSON（仅当尚未用过工具时尝试）——
        if (!usedAnyTool) {
          const plan = this.tryParsePlan(result.text, tools);
          if (plan) {
            yield {
              type: 'plan',
              content: `降级路径：模型未使用 function-calling，解析为 ${plan.length} 步计划`,
              stepIndex: step,
              degraded: true,
            };
            usedAnyTool = true;
            for (const s of plan) {
              yield { type: 'tool_call', toolName: s.tool, toolArgs: s.args, stepIndex: step, degraded: true };
              const toolResult = await this.executeTool(s.tool, s.args, tools, controller.signal);
              messages.push({
                role: 'tool',
                content: this.stringifyResult(toolResult.value),
                tool_call_id: `plan-${step}-${s.tool}`,
              });
              yield {
                type: 'tool_result',
                toolName: s.tool,
                toolResult: toolResult.value,
                stepIndex: step,
                elapsedMs: toolResult.elapsedMs,
                degraded: true,
              };
            }
            continue; // 进入 reflect
          }
        }

        // —— 最终文本回答 ——
        if (result.text) {
          yield { type: 'text', content: result.text, stepIndex: step };
        }

        // Reflect：用过工具时让 LLM 校验结果完整性
        if (usedAnyTool) {
          yield* this.reflect(messages, task, controller.signal, timeoutMs, step);
        }
        yield { type: 'done', stepIndex: step };
        return;
      }

      // 步数超限
      yield {
        type: 'text',
        content: `已达最大步数 ${maxSteps}，停止执行。当前已完成的工具调用结果保留。`,
        stepIndex: step,
      };
      yield { type: 'done', stepIndex: step };
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  cancel(sessionId: string): void {
    const c = this.controllers.get(sessionId);
    if (c) {
      c.abort();
      this.controllers.delete(sessionId);
    }
  }

  // ============ 内部方法 ============

  private buildSystemPrompt(task: AgentTask, tools: ToolDefinition[]): string {
    const toolList = tools
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');
    const ctx = task.context
      ? `\n当前场景上下文：${JSON.stringify(task.context)}`
      : '';
    return `你是一个教育场景的 AI Agent。根据用户目标，调用合适的工具完成任务。
你可以一次调用多个工具，也可以分步调用。所有工具的入参和返回都是结构化 JSON。

可用工具：
${toolList}

规则：
- 能用工具就调用工具，不要凭空编造结果
- 工具返回后会继续收到结果，再决定下一步
- 全部完成后，用中文给出简洁总结
- 如果目标无法用现有工具完成，直接说明原因${ctx}`;
  }

  private buildUserMessage(task: AgentTask): string {
    return task.goal;
  }

  /** 构造 OpenAI 兼容 tools 请求体字段 */
  private buildToolsPayload(tools: ToolDefinition[]) {
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /** 单次 LLM 调用：自管 fetch + 流式累积 text 与 tool_calls */
  private async callLLM(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<LLMResult> {
    const cfg = this.getConfig();
    const url = buildChatCompletionsURL(cfg.baseURL);
    const { signal: merged, cleanup } = withTimeout(signal, timeoutMs);

    const body: Record<string, unknown> = {
      model: cfg.model,
      messages,
      stream: true,
    };
    // 有工具时带上 tools + tool_choice=auto（让模型自主决定）
    if (tools.length > 0) {
      body.tools = this.buildToolsPayload(tools);
      body.tool_choice = 'auto';
    }

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: merged,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`LLM API ${resp.status} ${resp.statusText}: ${text.slice(0, 300)}`);
      }

      let textBuf = '';
      let finishReason: string | null = null;
      const toolAcc = new Map<number, ChatToolCall>();

      for await (const chunk of parseSSE<unknown>(resp, merged)) {
        if (merged.aborted) break;
        // 累积文本
        const token = extractDeltaText(chunk);
        if (token) textBuf += token;
        // 累积工具调用
        const deltas = extractToolCalls(chunk);
        if (deltas.length) accumulateToolCalls(toolAcc, deltas);
        // finish_reason（通常在最后一帧）
        const fr = extractFinishReason(chunk);
        if (fr) finishReason = fr;
      }

      const toolCalls = [...toolAcc.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
        .filter((tc) => tc.function.name); // 过滤掉没拿到 name 的残片

      return { text: textBuf, toolCalls, finishReason };
    } finally {
      cleanup();
    }
  }

  /** 执行单个工具，带超时与错误兜底 */
  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    tools: ToolDefinition[],
    signal: AbortSignal,
  ): Promise<{ value: unknown; elapsedMs: number }> {
    const tool = tools.find((t) => t.name === name);
    const t0 = performance.now();
    if (!tool) {
      return { value: { error: `未知工具：${name}` }, elapsedMs: 0 };
    }
    try {
      const value = await tool.execute(args, signal);
      return { value, elapsedMs: Math.round(performance.now() - t0) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { value: { error: msg }, elapsedMs: Math.round(performance.now() - t0) };
    }
  }

  /** Reflect 阶段：让 LLM 校验结果完整性，产出反思文本 */
  private async *reflect(
    messages: ChatMessage[],
    task: AgentTask,
    signal: AbortSignal,
    timeoutMs: number,
    step: number,
  ): AsyncIterable<AgentEvent> {
    messages.push({
      role: 'user',
      content: `请回顾以上工具调用与结果，校验是否完整达成了目标"${task.goal}"。
- 若有缺失，说明缺什么（不要再调用工具，仅指出）
- 若已完整，用一句话总结成果
直接输出结论，不要前缀。`,
    });
    try {
      const result = await this.callLLM(messages, [], signal, timeoutMs);
      if (result.text) {
        yield { type: 'text', content: `反思：${result.text}`, stepIndex: step };
      }
    } catch (e) {
      // reflect 失败不影响主流程，仅记录
      const msg = e instanceof Error ? e.message : String(e);
      yield { type: 'text', content: `反思跳过（${msg}）`, stepIndex: step };
    }
  }

  /** 解析工具入参 JSON 字符串，失败返回空对象 */
  private safeParseArgs(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  /** 把工具返回值序列化为 tool 角色消息的 content 字符串 */
  private stringifyResult(value: unknown): string {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * 降级路径：尝试把 LLM 文本解析为 {steps:[{tool,args}]} 计划。
   * 多策略提取：直接 parse → ```json 代码块 → 首个 {...} 子串。
   * 仅当解析出的步骤引用了已知工具名才认为是有效计划。
   */
  private tryParsePlan(text: string, tools: ToolDefinition[]): PlanStep[] | null {
    if (!text || !text.includes('{')) return null;
    const toolNames = new Set(tools.map((t) => t.name));

    const candidates: string[] = [];
    // 1. 直接 parse
    candidates.push(text.trim());
    // 2. ```json ... ``` 代码块
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) candidates.push(fence[1].trim());

    for (const candidate of candidates) {
      const parsed = this.extractFirstJSON(candidate);
      if (!parsed) continue;
      const steps = this.normalizePlanSteps(parsed, toolNames);
      if (steps.length > 0) return steps;
    }
    return null;
  }

  /** 从字符串中提取首个完整 JSON 对象/数组（贪心匹配括号） */
  private extractFirstJSON(s: string): unknown {
    const start = s.search(/[{[]/);
    if (start === -1) return null;
    const opener = s[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(s.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }

  /** 把解析出的对象规范化为 PlanStep[]，校验工具名合法 */
  private normalizePlanSteps(parsed: unknown, toolNames: Set<string>): PlanStep[] {
    if (!parsed || typeof parsed !== 'object') return [];
    // 兼容 {steps:[...]} 或直接 [...]
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { steps?: unknown[] }).steps)
        ? (parsed as { steps: unknown[] }).steps
        : [];
    const steps: PlanStep[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const tool = typeof obj.tool === 'string' ? obj.tool : typeof obj.name === 'string' ? (obj.name as string) : '';
      if (!tool || !toolNames.has(tool)) continue;
      const args =
        obj.args && typeof obj.args === 'object' && !Array.isArray(obj.args)
          ? (obj.args as Record<string, unknown>)
          : obj.arguments && typeof obj.arguments === 'object' && !Array.isArray(obj.arguments)
            ? (obj.arguments as Record<string, unknown>)
            : {};
      steps.push({ tool, args });
    }
    return steps;
  }
}
