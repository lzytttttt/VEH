import type { KnowledgeChunk, RetrievalResult, Retriever } from './types';
import type { VectorStore } from './VectorStore';
import type { Embedder } from './types';

/**
 * 语义检索器 — embed query → VectorStore 余弦 top-k
 *
 * 当 Embedder 返回空（API 不可用）或 VectorStore 无向量时，自动降级 BM25 关键词检索，
 * 保证离线/无 embedding 时仍可用。
 */
export class SemanticRetriever implements Retriever {
  readonly name = 'SemanticRetriever';

  constructor(
    private readonly store: VectorStore,
    private readonly embedder: Embedder,
  ) {}

  async retrieve(query: string, k = 3): Promise<RetrievalResult[]> {
    // 1. 尝试语义检索
    const vecs = await this.embedder.embed([query]);
    if (vecs.length > 0) {
      const results = this.store.search(vecs[0], k);
      if (results.length > 0) {
        return results.map((r) => ({ chunk: r.chunk, score: r.score }));
      }
    }
    // 2. 降级 BM25
    return bm25Search(this.store.all(), query, k);
  }
}

/**
 * BM25 关键词检索（无 embedding 时的降级路径）
 *
 * 简化实现：query 分词后按词频加权打分，返回 top-k。
 * 文档少（<500）时效果与语义检索接近（方案风险对策已论证）。
 */
export function bm25Search(chunks: KnowledgeChunk[], query: string, k: number): RetrievalResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const scored: RetrievalResult[] = [];
  const avgLen = chunks.reduce((s, c) => s + c.text.length, 0) / (chunks.length || 1);
  for (const chunk of chunks) {
    const tokens = tokenize(chunk.text);
    let score = 0;
    for (const term of terms) {
      const tf = tokens.filter((t) => t === term).length;
      if (tf === 0) continue;
      // 简化 BM25：tf 加权 + 文档长度归一
      score += (tf * (1.5 + 1)) / (tf + 1.5 * (1 - 0.25 + 0.25 * (chunk.text.length / (avgLen || 1))));
    }
    if (score > 0) {
      scored.push({ chunk, score: Math.min(1, score / (terms.length * 2)) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/** 简单中文/英文分词：英文按空格，中文按 2-gram */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();
  // 英文词
  const enWords = lower.match(/[a-z]{2,}/g) ?? [];
  tokens.push(...enWords);
  // 中文 2-gram
  const cjk = lower.match(/[\u4e00-\u9fa5]+/g) ?? [];
  for (const seg of cjk) {
    for (let i = 0; i < seg.length - 1; i++) {
      tokens.push(seg.slice(i, i + 2));
    }
    if (seg.length === 1) tokens.push(seg);
  }
  return tokens;
}
