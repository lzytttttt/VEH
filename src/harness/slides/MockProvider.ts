import type {
  SlidesChatInput,
  SlidesDraftInput,
  SlidesGenChunk,
  SlidesGenProvider,
} from './types';
import { buildSlidesContent, matchSlidesChat } from './scripts';

/**
 * Mock Slides Provider
 *
 * 演示脚本驱动 + 流式输出：
 * - streamDraft 按幻灯片逐页 yield，页间 yield section_break（'---'）
 * - streamChat 关键词匹配返回微调建议，按句切分打字机输出
 * - 接入真实 LLM 时换 SlidesAdapter 即可，业务代码一行不改
 */
export class MockSlidesProvider implements SlidesGenProvider {
  readonly name = 'MockSlidesProvider (Scripted)';

  async *streamDraft(input: SlidesDraftInput): AsyncIterable<SlidesGenChunk> {
    const slides = buildSlidesContent(input);
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) {
        await sleep(120);
        yield { type: 'section_break', content: '---\n', slideIndex: i };
      }
      await sleep(90);
      yield { type: 'text', content: slides[i] + '\n', slideIndex: i };
    }
    await sleep(100);
    yield { type: 'text', content: '', done: true };
  }

  async *streamChat(input: SlidesChatInput): AsyncIterable<SlidesGenChunk> {
    const reply = matchSlidesChat(input);
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
