import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';

/**
 * OpenAI 兼容接口 Adapter（骨架）
 *
 * 接入真实 API 时需替换：
 * 1. baseURL（默认 https://api.openai.com/v1）
 * 2. apiKey（通过环境变量或后端代理注入）
 * 3. model（如 gpt-4o, gpt-4-vision-preview）
 * 4. stream 解析（SSE 协议：data: { ... } 行格式）
 */
export class OpenAIAdapter implements VLMProvider {
  readonly name = 'OpenAI Compatible Adapter';

  private baseURL = 'https://api.openai.com/v1';
  private apiKey = '';
  private model = 'gpt-4o';

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    console.error('OpenAIAdapter not implemented', { input, baseURL: this.baseURL, model: this.model });
    throw new Error('OpenAIAdapter not implemented — 请在 adapters/OpenAIAdapter.ts 接入真实 API');
  }

  cancel(_sessionId: string): void {
    // 真实实现：abort fetch stream
  }
}
