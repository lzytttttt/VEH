import type { KnowledgeChunk } from './types';

const STORAGE_KEY = 'vlm-edu-hub:rag-vectorstore';

/**
 * 纯 TS 向量存储 — 内存 Map + 余弦相似度 + LocalStorage 持久化
 *
 * 设计取舍：文档 <500 条时 O(n·d) 余弦检索完全够用（d=64 时 500×64=32k 次乘加，
 * 亚毫秒级）。不引入外部向量库，零依赖。量大时再演进到 IndexedDB / 后端。
 */
export class VectorStore {
  private chunks = new Map<string, KnowledgeChunk>();

  constructor() {
    this.load();
  }

  /** upsert 单个 chunk（同 id 覆盖） */
  upsert(chunk: KnowledgeChunk): void {
    this.chunks.set(chunk.id, chunk);
    this.schedulePersist();
  }

  upsertMany(items: KnowledgeChunk[]): void {
    for (const c of items) this.chunks.set(c.id, c);
    this.schedulePersist();
  }

  get(id: string): KnowledgeChunk | undefined {
    return this.chunks.get(id);
  }

  all(): KnowledgeChunk[] {
    return [...this.chunks.values()];
  }

  size(): number {
    return this.chunks.size;
  }

  clear(): void {
    this.chunks.clear();
    this.schedulePersist();
  }

  /**
   * 余弦相似度检索 top-k。
   * 无向量或维度不一致的 chunk 跳过（避免脏数据干扰）。
   */
  search(queryVec: number[], k: number): { chunk: KnowledgeChunk; score: number }[] {
    const results: { chunk: KnowledgeChunk; score: number }[] = [];
    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding || chunk.embedding.length !== queryVec.length) continue;
      const score = cosine(queryVec, chunk.embedding);
      results.push({ chunk, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  // —— 持久化 ——
  private writeTimer: number | null = null;
  private schedulePersist(): void {
    if (this.writeTimer != null) clearTimeout(this.writeTimer);
    this.writeTimer = window.setTimeout(() => {
      this.writeTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.all()));
      } catch (e) {
        console.error('VectorStore persist failed', e);
      }
    }, 300);
  }
  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as KnowledgeChunk[];
      for (const c of arr) this.chunks.set(c.id, c);
    } catch (e) {
      console.warn('VectorStore load failed', e);
    }
  }
}

/** 余弦相似度 */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
