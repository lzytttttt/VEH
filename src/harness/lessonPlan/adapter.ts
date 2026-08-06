import type {
  LessonPlanChatInput,
  LessonPlanDraftInput,
  LessonPlanGenChunk,
  LessonPlanGenProvider,
} from './types';

/**
 * Lesson Plan LLM Adapter — 真实 LLM API 接入占位
 *
 * 接入路径：
 * 1. 在此实现 streamDraft/streamChat，调用真实 LLM（OpenAI/通义/本地 vLLM）的 SSE 流式接口
 * 2. 将 LLM 增量 token 包装为 LessonPlanGenChunk yield
 * 3. 在 ./index.ts 把 ACTIVE 切换为 'api'
 *
 * 关键约定：
 * - LLM system prompt 应要求输出 Markdown 教案（含标题/目标/过程/作业等结构）
 * - 流式 SSE 解析后，把 token 累积成"行"再 yield，避免逐字符抖动
 */
export class LessonPlanAdapter implements LessonPlanGenProvider {
  readonly name = 'LessonPlanAdapter (LLM API)';

  async *streamDraft(_input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk> {
    // TODO: 接入 LLM SSE 流式接口
    //   const resp = await fetch('/api/llm/lesson-plan', { ... });
    //   for await (const token of parseSSE(resp.body)) yield { type: 'text', content: token };
    throw new Error(
      'LessonPlanAdapter 未接入 LLM API。请在 src/harness/lessonPlan/adapter.ts 实现真实调用，并在 index.ts 切换 ACTIVE 为 "api"。',
    );
  }

  async *streamChat(_input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk> {
    throw new Error(
      'LessonPlanAdapter 未接入 LLM API。请实现 streamChat 后切换 provider。',
    );
  }
}
