import type { ChunkSource, KnowledgeChunk } from './types';
import type { Embedder } from './types';
import { getScript } from '../MockVLMProvider';
import { getCapabilityProvider } from '../providerRegistry';
import type { ScenarioType } from '../types';

const SCENARIOS: ScenarioType[] = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'];
const CHUNK_SIZE = 200; // 字符数
const CHUNK_OVERLAP = 40;

/**
 * 索引器：把知识节点 / 课堂转录 / 教案课件内容切分为 chunk → embed → 入库
 *
 * 索引来源（与现有 Mock 数据对齐，不重复造数据）：
 * - wiki：MockCapabilityProvider.getWiki(scenario).nodes 的 summary + details
 * - transcript：getScript(scenario).transcript
 * 教案/课件内容在生成后由调用方主动调 indexDocument 入库（增量）。
 */
export class Indexer {
  constructor(
    private readonly store: { upsertMany(items: KnowledgeChunk[]): void; upsert(c: KnowledgeChunk): void; size(): number },
    private readonly embedder: Embedder,
  ) {}

  /** 全量索引所有场景的 wiki + transcript（首次懒加载时调用） */
  async indexAll(): Promise<void> {
    const chunks: KnowledgeChunk[] = [];
    for (const scenario of SCENARIOS) {
      chunks.push(...(await this.indexWiki(scenario, /*silent*/ true)));
      chunks.push(...this.indexTranscript(scenario));
    }
    if (chunks.length > 0) this.store.upsertMany(chunks);
  }

  /** 索引某场景的 wiki 节点 */
  async indexWiki(scenario: ScenarioType, silent = false): Promise<KnowledgeChunk[]> {
    try {
      const wiki = await getCapabilityProvider().getWiki(scenario);
      const chunks: KnowledgeChunk[] = [];
      for (const node of wiki.nodes) {
        const text = `${node.title}（${node.category}）\n${node.summary}\n${node.details}`;
        for (const piece of splitChunk(text)) {
          chunks.push({
            id: `wiki:${scenario}:${node.id}:${piece.idx}`,
            source: 'wiki',
            sourceId: node.id,
            text: piece.text,
            metadata: { scenario, title: node.title, category: node.category },
          });
        }
      }
      const embeddings = await this.embedder.embed(chunks.map((c) => c.text));
      chunks.forEach((c, i) => (c.embedding = embeddings[i]));
      this.store.upsertMany(chunks);
      return chunks;
    } catch (e) {
      if (!silent) console.warn('Indexer.indexWiki failed', e);
      return [];
    }
  }

  /** 索引某场景的课堂转录（同步，无需 embed 调用——用 embedder 批量） */
  indexTranscript(scenario: ScenarioType): KnowledgeChunk[] {
    try {
      const script = getScript(scenario);
      const chunks: KnowledgeChunk[] = [];
      for (const line of script.transcript) {
        const text = `[${Math.floor(line.t / 60)}:${(line.t % 60).toString().padStart(2, '0')}][${line.speaker}] ${line.text}`;
        chunks.push({
          id: `transcript:${scenario}:${line.t}`,
          source: 'transcript',
          sourceId: scenario,
          text,
          metadata: { scenario, t: line.t, speaker: line.speaker },
        });
      }
      // 异步 embed（不阻塞，失败则这些 chunk 无 embedding，BM25 仍可用）
      this.embedder
        .embed(chunks.map((c) => c.text))
        .then((vecs) => {
          chunks.forEach((c, i) => (c.embedding = vecs[i]));
          this.store.upsertMany(chunks);
        })
        .catch(() => {});
      this.store.upsertMany(chunks);
      return chunks;
    } catch (e) {
      console.warn('Indexer.indexTranscript failed', e);
      return [];
    }
  }

  /** 增量索引生成的教案/课件内容（生成后调用） */
  async indexDocument(source: Extract<ChunkSource, 'lessonPlan' | 'slides'>, sourceId: string, text: string): Promise<void> {
    const chunks: KnowledgeChunk[] = [];
    for (const piece of splitChunk(text)) {
      chunks.push({
        id: `${source}:${sourceId}:${piece.idx}`,
        source,
        sourceId,
        text: piece.text,
        metadata: { sourceId },
      });
    }
    const embeddings = await this.embedder.embed(chunks.map((c) => c.text));
    chunks.forEach((c, i) => (c.embedding = embeddings[i]));
    this.store.upsertMany(chunks);
  }
}

/** 按长度切分 chunk（带 overlap） */
function splitChunk(text: string): { idx: number; text: string }[] {
  const pieces: { idx: number; text: string }[] = [];
  if (!text) return pieces;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= CHUNK_SIZE) {
    pieces.push({ idx: 0, text: clean });
    return pieces;
  }
  let i = 0;
  let idx = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    pieces.push({ idx, text: clean.slice(i, end) });
    idx++;
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return pieces;
}
