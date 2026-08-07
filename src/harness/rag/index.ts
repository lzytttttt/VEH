/**
 * RAG Harness 自包含注册中心
 *
 * 遵循 agent/、lessonPlan/ 的自包含模式，不放入中央 providerRegistry。
 * active 来自 apiConfigStore 的 'rag' 条目：
 * - 'mock' → MockRetriever（BM25 关键词，离线可用，懒加载 Mock wiki/transcript）
 * - 'api'  → SemanticRetriever（真实 embedding + 余弦，API 不可用时降级 BM25）
 *
 * 检索注入点（由各生成方调用 retrieveContext）：
 * - ChatAssistant（Wiki 回答前）
 * - lessonTool / governanceTool（生成前注入相关上下文）
 */
import { VectorStore } from './VectorStore';
import { Indexer } from './Indexer';
import { SemanticRetriever } from './Retriever';
import { MockRetriever } from './MockRetriever';
import { getEmbedder } from './Embedder';
import { getProviderConfig } from '../../stores/apiConfigStore';
import type { Retriever } from './types';

let sharedStore: VectorStore | null = null;
let indexed = false;

function getStore(): VectorStore {
  if (!sharedStore) sharedStore = new VectorStore();
  return sharedStore;
}

/** 首次语义检索前全量索引 wiki + transcript（api 模式） */
async function ensureIndexed(): Promise<void> {
  if (indexed) return;
  indexed = true;
  const store = getStore();
  if (store.size() > 0) return; // 已有持久化数据
  const indexer = new Indexer(store, getEmbedder());
  await indexer.indexAll();
}

let cached: Retriever | null = null;
let lastActive: string | null = null;

/** 获取当前 active 的检索器（mock / api），带实例缓存 */
export function getRetriever(): Retriever {
  const active = getProviderConfig('rag').active;
  if (cached && lastActive === active) return cached;
  cached = active === 'api' ? new SemanticRetriever(getStore(), getEmbedder()) : new MockRetriever();
  lastActive = active;
  return cached;
}

/**
 * 检索并拼接为上下文文本（注入各生成点的 system prompt）。
 * 失败返回空串（调用方无感，不阻断主流程）。
 */
export async function retrieveContext(query: string, k = 3): Promise<string> {
  try {
    const active = getProviderConfig('rag').active;
    if (active === 'api') await ensureIndexed();
    const retriever = getRetriever();
    const results = await retriever.retrieve(query, k);
    if (results.length === 0) return '';
    return results
      .map((r) => `[${r.chunk.source}${r.chunk.metadata?.title ? `:${r.chunk.metadata.title}` : ''}] ${r.chunk.text.slice(0, 160)}`)
      .join('\n---\n');
  } catch (e) {
    console.warn('retrieveContext failed', e);
    return '';
  }
}

/** 把生成的教案/课件内容入库（仅 api 模式，供后续检索复用） */
export async function indexGenerated(
  source: 'lessonPlan' | 'slides',
  sourceId: string,
  text: string,
): Promise<void> {
  try {
    if (getProviderConfig('rag').active !== 'api') return;
    await ensureIndexed();
    const indexer = new Indexer(getStore(), getEmbedder());
    await indexer.indexDocument(source, sourceId, text);
  } catch (e) {
    console.warn('indexGenerated failed', e);
  }
}

export function listRetrievers(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Retriever (BM25 关键词)', available: true },
    { id: 'api', name: 'Semantic Retriever (embedding)', available: true },
  ];
}

export type { Retriever, RetrievalResult } from './types';
