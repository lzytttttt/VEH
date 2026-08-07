import type { RetrievalResult, Retriever } from './types';
import { getScript } from '../MockVLMProvider';
import { getCapabilityProvider } from '../providerRegistry';
import type { ScenarioType } from '../types';
import { bm25Search, tokenize } from './Retriever';

const SCENARIOS: ScenarioType[] = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'];

/**
 * Mock 检索器 — 关键词匹配（BM25）返回结果
 *
 * 离线可用、零依赖。chunk 数据从 MockCapabilityProvider.getWiki + getScript().transcript
 * 派生（不重复造数据）。用于 rag active='mock' 时，与 MockEmbedder+SemanticRetriever
 * 行为一致（MockEmbedder 的 hash 向量本质也是字符级相似度）。
 *
 * 为保证语义检索与 Mock 检索结果可比对，Mock 模式也走 BM25（更直观）。
 */
export class MockRetriever implements Retriever {
  readonly name = 'MockRetriever (BM25)';
  private chunksCache: RetrievalResult['chunk'][] | null = null;

  /** 懒加载全部场景的 wiki + transcript chunk */
  private async getChunks(): Promise<RetrievalResult['chunk'][]> {
    if (this.chunksCache) return this.chunksCache;
    const chunks: RetrievalResult['chunk'][] = [];
    for (const scenario of SCENARIOS) {
      try {
        const wiki = await getCapabilityProvider().getWiki(scenario);
        for (const node of wiki.nodes) {
          chunks.push({
            id: `wiki:${scenario}:${node.id}`,
            source: 'wiki',
            sourceId: node.id,
            text: `${node.title}（${node.category}）\n${node.summary}\n${node.details}`,
            metadata: { scenario, title: node.title },
          });
        }
      } catch {
        /* skip */
      }
      try {
        const script = getScript(scenario);
        for (const line of script.transcript) {
          chunks.push({
            id: `transcript:${scenario}:${line.t}`,
            source: 'transcript',
            sourceId: scenario,
            text: `[${line.speaker}] ${line.text}`,
            metadata: { scenario, t: line.t },
          });
        }
      } catch {
        /* skip */
      }
    }
    this.chunksCache = chunks;
    return chunks;
  }

  async retrieve(query: string, k = 3): Promise<RetrievalResult[]> {
    const chunks = await this.getChunks();
    return bm25Search(chunks as any, query, k);
  }
}

// 兜底：tokenize 复用（避免循环依赖，MockRetriever 直接用 bm25Search）
export { tokenize };
