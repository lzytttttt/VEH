import type { Embedder } from './types';
import { getProviderConfig } from '../../stores/apiConfigStore';
import { normalizeBaseURL } from '../adapters/sseUtils';

const MOCK_DIM = 64;

/**
 * Mock Embedder — 字符 hash 生成 64 维伪向量
 *
 * 确定性：相同文本必出相同向量（可重现）。通过字符分布让相似文本向量相近、
 * 不同文本向量分散，足够演示语义检索的"按相似度排序"效果。无外部依赖、毫秒级。
 */
export class MockEmbedder implements Embedder {
  readonly name = 'MockEmbedder (hash)';
  dim() {
    return MOCK_DIM;
  }
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => mockEmbed(t, MOCK_DIM));
  }
}

/** 字符 hash → 归一化伪向量 */
export function mockEmbed(text: string, dim = MOCK_DIM): number[] {
  const vec = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    vec[(c * 31 + i) % dim] += (c % 17) / 17;
    vec[(c * 7 + i * 3) % dim] += (c % 13) / 13;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

/**
 * API Embedder — OpenAI 兼容 /embeddings 端点
 *
 * 配置从 apiConfigStore 的 'rag' 条目懒读取。失败返回空数组（调用方降级 BM25）。
 */
export class ApiEmbedder implements Embedder {
  readonly name = 'ApiEmbedder';
  private cachedDim = 0;

  private cfg() {
    const c = getProviderConfig('rag');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'text-embedding-3-small',
    };
  }

  dim() {
    return this.cachedDim || 1536; // 默认假设，首次 embed 后修正
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { baseURL, apiKey, model } = this.cfg();
    const url = `${normalizeBaseURL(baseURL)}/embeddings`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, input: texts }),
      });
      if (!resp.ok) {
        console.warn('ApiEmbedder failed', resp.status, await resp.text().catch(() => ''));
        return [];
      }
      const data = (await resp.json()) as { data: { embedding: number[] }[] };
      if (!data.data?.length) return [];
      this.cachedDim = data.data[0].embedding.length;
      return data.data.map((d) => d.embedding);
    } catch (e) {
      console.warn('ApiEmbedder error, will fallback to BM25', e);
      return [];
    }
  }
}

/** 按 rag active 取 Embedder（mock / api） */
export function getEmbedder(): Embedder {
  const active = getProviderConfig('rag').active;
  return active === 'api' ? new ApiEmbedder() : new MockEmbedder();
}
