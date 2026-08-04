import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';

/**
 * VLLM 本地部署 Adapter（骨架）
 *
 * 适用于 Qwen-VLM 3.6-27B int4 量化本地部署场景。
 * vLLM 服务通过 OpenAI 兼容协议暴露端点，因此本 adapter 实质上是 OpenAIAdapter 的本地变体。
 *
 * 接入真实 API 时需替换：
 * 1. baseURL（本地 vLLM 服务，如 http://localhost:8000/v1）
 * 2. apiKey：vLLM 默认无 key，可填 "EMPTY"
 * 3. model（如 Qwen/Qwen2-VL-7B-Instruct, Qwen/Qwen3-VL-27B-A15B-int4）
 * 4. stream 解析（OpenAI SSE 协议）
 * 5. 推荐启用 gemma3 / chat_template 与多模态 image_url 适配
 */
export class VLLMAdapter implements VLMProvider {
  readonly name = 'VLLM Local Adapter';

  private baseURL = 'http://localhost:8000/v1';
  private apiKey = 'EMPTY';
  private model = 'Qwen/Qwen2-VL-7B-Instruct';

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    console.error('VLLMAdapter not implemented', { input, baseURL: this.baseURL, model: this.model });
    throw new Error('VLLMAdapter not implemented — 请在 adapters/VLLMAdapter.ts 接入真实本地部署');
  }

  cancel(_sessionId: string): void {
    // 真实实现：abort fetch stream
  }
}
