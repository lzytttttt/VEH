import type {
  LessonPlanChatInput,
  LessonPlanDraftInput,
  LessonPlanGenChunk,
  LessonPlanGenProvider,
} from './types';
import {
  streamChatCompletion,
  createAbortController,
  normalizeMarkdownStream,
} from '../adapters/sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';

/**
 * Lesson Plan LLM Adapter — OpenAI 兼容流式调用参考实现
 *
 * 适用于 OpenAI / DeepSeek / 通义 / vLLM 等所有 OpenAI 兼容服务，
 * 与 OpenAIAdapter 同协议：POST /chat/completions 流式 + SSE delta.content。
 *
 * 配置从 apiConfigStore 的 'lessonPlan' 条目懒读取（调用时取最新），
 * 因此注册中心缓存的实例也能反映面板里改后的 baseURL/apiKey/model。
 */
export class LessonPlanAdapter implements LessonPlanGenProvider {
  readonly name = 'LessonPlanAdapter (LLM API)';

  private controllers = new Map<string, AbortController>();

  /** 调用时懒读取最新配置（非构造时），避免脏缓存 */
  private cfg() {
    const c = getProviderConfig('lessonPlan');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'deepseek-v4-flash',
    };
  }

  /** streamDraft 使用的 system prompt：要求输出结构化 Markdown 教案，并强制换行结构 */
  private static readonly DRAFT_SYSTEM = `你是一位资深教案撰写老师。请根据用户给定的课题/学科/学情/目标，输出一份完整、结构清晰的 Markdown 教案。

**【输出格式硬性要求 — 不遵守将无法被编辑器识别】**
1. 每个 #/##/### 标题必须**独占一行**，且标题前后各空一行
2. 段落之间空一行
3. 列表项之间不空行
4. 每个 H1/H2/H3/H4 标题前必须有"换行"才能被识别为标题块
5. 全文以 --- 单独一行收尾

**【结构模板】**（必须按这个顺序，缺一不可）：
# 课题名

## 一、教学目标

### 知识与技能
- 要点 1
- 要点 2

### 过程与方法
- 要点 1
- 要点 2

### 情感态度与价值观
- 要点 1

## 二、教学重难点

### 重点
- ...

### 难点
- ...

## 三、教学过程

### 导入 (X分钟)
- ...

### 新授 (X分钟)
- ...

### 练习 (X分钟)
- ...

### 小结 (X分钟)
- ...

## 四、作业与拓展

### 基础作业
- ...

### 拓展提升
- ...

## 五、板书设计

（板书布局示意：左上标题、右上关键概念、左下例题、右下小结）

---

**要求补充**：
- 用中文，直接给出可用的教案文本，不要任何解释/前言/后记
- 必须保留所有空行（标题前后各一行，段落之间一行）
- 表格用标准 Markdown 表格语法
- 不要把多个段落写到同一行`;

  /** 把流式文本片段转为 LessonPlanGenChunk：保留完整换行结构 */
  private async *streamToChunks(
    tokens: AsyncIterable<string>,
    controller: AbortController,
  ): AsyncIterable<LessonPlanGenChunk> {
    try {
      for await (const chunk of normalizeMarkdownStream(tokens, controller.signal)) {
        if (controller.signal.aborted) break;
        yield { type: 'text', content: chunk };
      }
    } finally {
      controller.abort();
    }
  }

  async *streamDraft(input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk> {
    const sessionId = `lessonDraft-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    const userParts: string[] = [];
    if (input.topic) userParts.push(`课题：${input.topic}`);
    if (input.subject) userParts.push(`学科：${input.subject}`);
    if (input.duration) userParts.push(`课时：${input.duration} 分钟`);
    if (input.audience) userParts.push(`学情：${input.audience}`);
    if (input.objectives?.length) userParts.push(`教学目标：\n${input.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);

    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          { role: 'system', content: LessonPlanAdapter.DRAFT_SYSTEM },
          { role: 'user', content: userParts.join('\n') || '请生成一份通用教案框架' },
        ],
        bodyOverrides: { temperature: 0.6, max_tokens: 3500 },
        signal: controller.signal,
      });
      for await (const chunk of this.streamToChunks(tokens, controller)) {
        yield chunk;
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  private static readonly CHAT_SYSTEM = `你是一位教案撰写老师。基于用户提供的当前教案内容（Markdown），用中文回答用户的追问/微调请求。

**输出要求**：
- 输出**可直接写回编辑器的 Markdown 片段**
- 保留完整换行（标题前后各空一行，段落之间一行）
- 直接输出结果，不要任何解释/前言/后记`;

  async *streamChat(input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk> {
    const sessionId = `lessonChat-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          { role: 'system', content: LessonPlanAdapter.CHAT_SYSTEM },
          {
            role: 'user',
            content: `当前教案（Markdown）：\n\`\`\`\n${input.currentContent}\n\`\`\`\n\n用户请求：${input.query}`,
          },
        ],
        bodyOverrides: { temperature: 0.4, max_tokens: 2000 },
        signal: controller.signal,
      });
      for await (const chunk of this.streamToChunks(tokens, controller)) {
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
