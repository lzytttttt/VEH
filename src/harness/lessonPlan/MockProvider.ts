import type {
  LessonPlanChatInput,
  LessonPlanDraftInput,
  LessonPlanGenChunk,
  LessonPlanGenProvider,
} from './types';
import { buildLessonPlanLines, matchLessonPlanChat } from './scripts';

/**
 * Mock Lesson Plan Provider
 *
 * 演示脚本驱动 + 流式输出：
 * - streamDraft 按教案模板逐行 yield chunk（模拟 LLM 流式生成）
 * - streamChat 关键词匹配返回微调建议，按句切分打字机输出
 * - 接入真实 LLM 时换 LessonPlanAdapter 即可，业务代码一行不改
 */
export class MockLessonPlanProvider implements LessonPlanGenProvider {
  readonly name = 'MockLessonPlanProvider (Scripted)';

  async *streamDraft(input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk> {
    const lines = buildLessonPlanLines(input);
    for (const line of lines) {
      await sleep(80);
      yield { type: 'text', content: line + '\n' };
    }
    await sleep(100);
    yield { type: 'text', content: '', done: true };
  }

  async *streamChat(input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk> {
    const reply = matchLessonPlanChat(input);
    const sentences = reply.split(/(?<=[。！？\n])/).filter((s) => s.trim());
    for (const s of sentences) {
      await sleep(130);
      yield { type: 'text', content: s };
    }
    await sleep(80);
    yield { type: 'text', content: '', done: true };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
