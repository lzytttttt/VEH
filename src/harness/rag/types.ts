/**
 * RAG 知识库核心类型
 *
 * 与 Agent / Wiki / 教案 / 治理共享：检索结果以 KnowledgeChunk.text 注入各生成点的上下文。
 * 持久化对齐 sseUtils/apiConfigStore 的 LocalStorage 模式（debounced + try/catch）。
 */

/** 知识块来源类型 */
export type ChunkSource = 'wiki' | 'transcript' | 'lessonPlan' | 'slides';

/** 单个知识块（入库与检索单元） */
export interface KnowledgeChunk {
  id: string;
  source: ChunkSource;
  /** 来源节点/会话 id（wiki 节点 id / session id / 教案 topic） */
  sourceId: string;
  text: string;
  /** 向量（Mock 版为 hash 伪向量，API 版为真实 embedding） */
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

/** 检索结果 */
export interface RetrievalResult {
  chunk: KnowledgeChunk;
  /** 相似度分数 0-1 */
  score: number;
}

/** Embedding 接口（Mock hash 版 + API 版均实现） */
export interface Embedder {
  readonly name: string;
  /** 单条/批量文本 → 向量 */
  embed(texts: string[]): Promise<number[][]>;
  /** 向量维度（用于一致性校验） */
  dim(): number;
}

/** 检索器接口（MockRetriever 与 SemanticRetriever 均实现） */
export interface Retriever {
  readonly name: string;
  /** 语义/关键词检索 top-k */
  retrieve(query: string, k?: number): Promise<RetrievalResult[]>;
}
