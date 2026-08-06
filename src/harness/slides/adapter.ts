import type {
  SlidesChatInput,
  SlidesDraftInput,
  SlidesGenChunk,
  SlidesGenProvider,
} from './types';

/**
 * Slides LLM Adapter — 真实 LLM API 接入占位
 *
 * 接入路径：
 * 1. 在此实现 streamDraft/streamChat，调用真实 LLM 的 SSE 流式接口
 * 2. LLM system prompt 应要求用 `---` 分页输出幻灯片 markdown
 * 3. 解析 SSE token，按"行"累积 yield，遇到 `---` yield section_break
 * 4. 在 ./index.ts 把 ACTIVE 切换为 'api'
 */
export class SlidesAdapter implements SlidesGenProvider {
  readonly name = 'SlidesAdapter (LLM API)';

  async *streamDraft(_input: SlidesDraftInput): AsyncIterable<SlidesGenChunk> {
    // TODO: 接入 LLM SSE 流式接口
    //   const resp = await fetch('/api/llm/slides', { ... });
    //   let buf = '';
    //   for await (const token of parseSSE(resp.body)) {
    //     buf += token;
    //     // 检测 --- 分页符，split 后 yield section_break
    //   }
    throw new Error(
      'SlidesAdapter 未接入 LLM API。请在 src/harness/slides/adapter.ts 实现真实调用，并在 index.ts 切换 ACTIVE 为 "api"。',
    );
  }

  async *streamChat(_input: SlidesChatInput): AsyncIterable<SlidesGenChunk> {
    throw new Error(
      'SlidesAdapter 未接入 LLM API。请实现 streamChat 后切换 provider。',
    );
  }
}
