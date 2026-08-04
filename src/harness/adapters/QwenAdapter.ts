import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';

/**
 * 通义千问 Qwen-VL Adapter（骨架）
 *
 * 接入真实 API 时需替换：
 * 1. baseURL（默认 https://dashscope.aliyuncs.com/api/v1）
 * 2. apiKey（通过环境变量或后端代理注入）
 * 3. model（如 qwen-vl-max, qwen2.5-vl-72b-instruct）
 * 4. stream 解析（DashScope SSE 协议）
 *
 * 本地 Qwen-VLM 部署（INT4 量化）走 VLLMAdapter，复用 OpenAI 兼容协议。
 */
export class QwenAdapter implements VLMProvider {
  readonly name = 'Qwen-VL Adapter';

  private baseURL = 'https://dashscope.aliyuncs.com/api/v1';
  private apiKey = '';
  private model = 'qwen-vl-max';

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    console.error('QwenAdapter not implemented', { input, baseURL: this.baseURL, model: this.model });
    throw new Error('QwenAdapter not implemented — 请在 adapters/QwenAdapter.ts 接入真实 API');
  }

  cancel(_sessionId: string): void {
    // 真实实现：abort fetch stream
  }
}
