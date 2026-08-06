import type { AnalysisChunk, AnalysisInput, VLMProvider } from '../types';
import { getProviderConfig } from '../../stores/apiConfigStore';

/**
 * 通义千问 Qwen-VL Adapter（骨架）
 *
 * 接入真实 API 时需替换：
 * 1. baseURL（默认 https://dashscope.aliyuncs.com/api/v1）
 * 2. apiKey（通过面板配置或后端代理注入）
 * 3. model（如 qwen-vl-max, qwen2.5-vl-72b-instruct）
 * 4. stream 解析（DashScope SSE 协议）
 *
 * 本地 Qwen-VLM 部署（INT4 量化）走 VLLMAdapter，复用 OpenAI 兼容协议。
 *
 * 配置从 apiConfigStore 的 'vlm' 条目懒读取（调用时取最新），
 * 面板切换 active='qwen' 时会自动套用 Qwen 预设 baseURL/model。
 */
export class QwenAdapter implements VLMProvider {
  readonly name = 'Qwen-VL Adapter';

  /** 调用时懒读取最新配置（非构造时），避免脏缓存 */
  private cfg() {
    const c = getProviderConfig('vlm');
    return {
      baseURL: c.baseURL || 'https://dashscope.aliyuncs.com/api/v1',
      apiKey: c.apiKey || '',
      model: c.model || 'qwen-vl-max',
    };
  }

  async *analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk> {
    const { baseURL, apiKey, model } = this.cfg();
    console.error('QwenAdapter not implemented', { input, baseURL, hasApiKey: !!apiKey, model });
    throw new Error('QwenAdapter not implemented — 请在 adapters/QwenAdapter.ts 接入真实 DashScope SSE 接口');
  }

  cancel(_sessionId: string): void {
    // 真实实现：abort fetch stream
  }
}
