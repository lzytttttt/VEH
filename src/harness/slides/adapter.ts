import type {
  SlidesChatInput,
  SlidesDraftInput,
  SlidesGenChunk,
  SlidesGenProvider,
} from './types';
import {
  streamChatCompletion,
  createAbortController,
  normalizeMarkdownStream,
} from '../adapters/sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';

/**
 * Slides LLM Adapter — OpenAI 兼容流式调用参考实现
 *
 * 与 LessonPlanAdapter 同协议（POST /chat/completions + SSE delta.content）。
 *
 * 关键约定：
 * - LLM system prompt 要求用 `---` 单行分页输出幻灯片 markdown
 * - 解析 SSE token，按"行"累积 yield；遇到独立 `---` 行 yield section_break 并自增 slideIndex
 *
 * 配置从 apiConfigStore 的 'slides' 条目懒读取（调用时取最新）。
 */
export class SlidesAdapter implements SlidesGenProvider {
  readonly name = 'SlidesAdapter (LLM API)';

  private controllers = new Map<string, AbortController>();

  private cfg() {
    const c = getProviderConfig('slides');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'deepseek-v4-flash',
    };
  }

  /**
   * 把流式 token 转换为 SlidesGenChunk：
   *  - 先过 normalize 修复 markdown 换行（确保 # 标题独占行，--- HR 独占行）
   *  - 再逐行扫描，遇独立 `---` yield section_break（content 带 \n 包裹，防粘连）
   *  - 其余行（含空行）作为 text yield，保留 \n 用于编辑器正确分块
   */
  private async *tokenToSlidesChunks(
    tokens: AsyncIterable<string>,
    controller: AbortController,
  ): AsyncIterable<SlidesGenChunk> {
    let slideIndex = 0;
    let pending = '';
    try {
      const normalized = normalizeMarkdownStream(tokens, controller.signal);
      for await (const piece of normalized) {
        if (controller.signal.aborted) break;
        pending += piece;
        if (pending.includes('\n')) {
          const lines = pending.split('\n');
          pending = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '---') {
              // \n 包裹防粘连：前一行末尾的 \n + \n---\n + 下一行开头的 \n
              // splitSlides 正则 \n\s*---\s*\n 才能正确匹配分页
              yield { type: 'section_break', content: '\n---\n', slideIndex: ++slideIndex };
            } else {
              // 保留空行（\n），编辑器 parseBlocks 靠空行分块
              yield { type: 'text', content: line + '\n', slideIndex };
            }
          }
        }
      }
      if (pending.trim()) {
        const trimmed = pending.trim();
        if (trimmed === '---') {
          yield { type: 'section_break', content: '\n---\n', slideIndex: ++slideIndex };
        } else {
          yield { type: 'text', content: pending, slideIndex };
        }
      }
    } finally {
      controller.abort();
    }
  }

  private static readonly DRAFT_SYSTEM = `你是一位课件撰写老师。根据用户给定的课题/学科/设计风格/学情，
用 Markdown 输出一份幻灯片课件。

**【输出格式硬性要求 — 不遵守将无法被识别】**
1. 每张幻灯片之间用**独占一行的 ---** 分隔（这是分页符，前后各空一行）
2. 每张幻灯片内部：标题用 # 一级标题，要点用 - 列表
3. 每个 # 标题必须独占一行，前面空一行
4. 不要把多张幻灯片挤在一行里

**【结构模板】**：
# 第一张幻灯片标题
- 要点 1
- 要点 2
- 要点 3

---

# 第二张幻灯片标题
- 要点 1
- ...

---

# 第三张幻灯片标题
- ...

---

**【风格说明】**：
- classic（经典）：标题 + 正文列表，简洁清晰
- modern（现代）：大标题 + 简短要点 + 关键词加粗
- dataviz（数据可视化）：包含表格、对比数据、统计图

**要求**：
- 输出 6-10 张幻灯片
- 直接给出课件文本，不要任何解释/前言/后记
- 中文
- 必须保留所有换行与空行结构`;

  async *streamDraft(input: SlidesDraftInput): AsyncIterable<SlidesGenChunk> {
    const sessionId = `slidesDraft-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    const userParts: string[] = [];
    if (input.topic) userParts.push(`课题：${input.topic}`);
    if (input.subject) userParts.push(`学科：${input.subject}`);
    if (input.design) userParts.push(`设计风格：${input.design}`);
    if (input.duration) userParts.push(`课时：${input.duration} 分钟`);
    if (input.audience) userParts.push(`学情：${input.audience}`);

    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          { role: 'system', content: SlidesAdapter.DRAFT_SYSTEM },
          { role: 'user', content: userParts.join('\n') || '请生成一份通用课件大纲' },
        ],
        bodyOverrides: { temperature: 0.6, max_tokens: 3500 },
        signal: controller.signal,
      });
      for await (const chunk of this.tokenToSlidesChunks(tokens, controller)) {
        yield chunk;
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  private static readonly CHAT_SYSTEM = `你是一位课件撰写老师。基于用户提供的当前课件内容（Markdown，使用 --- 分页），用中文回答用户的追问/微调请求。

**输出要求**：
- 输出**可直接写回编辑器的 Markdown 片段**
- 保留完整换行结构（标题独占行，--- 分页独占行）
- 直接输出结果，不要任何解释/前言/后记
- 设计风格：用户指定时遵循`;

  async *streamChat(input: SlidesChatInput): AsyncIterable<SlidesGenChunk> {
    const sessionId = `slidesChat-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          { role: 'system', content: SlidesAdapter.CHAT_SYSTEM },
          {
            role: 'user',
            content: `当前课件：\n\`\`\`\n${input.currentContent}\n\`\`\`\n\n用户请求：${input.query}`,
          },
        ],
        bodyOverrides: { temperature: 0.4, max_tokens: 2000 },
        signal: controller.signal,
      });
      for await (const chunk of this.tokenToSlidesChunks(tokens, controller)) {
        yield chunk;
      }
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
}
