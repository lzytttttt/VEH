import type {
  AnomalyAlert,
  GovernanceChunk,
  GovernanceContext,
  GovernanceProvider,
  ResearchSuggestion,
} from '../types';

/**
 * 治理 LLM API Adapter（骨架）
 *
 * 接入真实 LLM 时实现四个方法：
 * 1. streamBriefing：将 GovernanceContext 序列化为 prompt，调用 LLM 流式接口，解析 SSE 为 GovernanceChunk
 * 2. streamInsight：将 query + GovernanceContext 拼装为对话 prompt，流式返回
 * 3. detectAnomalies：让 LLM 基于聚合数据输出结构化 AnomalyAlert[]（JSON mode）
 * 4. suggestResearch：让 LLM 针对目标生成 ResearchSuggestion（JSON mode）
 *
 * 通过环境变量或后端代理注入 apiKey / baseURL / model。
 * 切换此 Adapter 后，业务代码一行不改（与 MockGovernanceProvider 接口一致）。
 */
export class GovernanceAdapter implements GovernanceProvider {
  readonly name = 'Governance LLM Adapter (skeleton)';

  private baseURL = '';
  private apiKey = '';
  private model = '';

  async *streamBriefing(_ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    console.error('GovernanceAdapter not implemented', { baseURL: this.baseURL, model: this.model });
    throw new Error('GovernanceAdapter.streamBriefing not implemented — 请接入真实 LLM API');
  }

  async *streamInsight(_query: string, _ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    throw new Error('GovernanceAdapter.streamInsight not implemented — 请接入真实 LLM API');
  }

  async detectAnomalies(_ctx: GovernanceContext): Promise<AnomalyAlert[]> {
    throw new Error('GovernanceAdapter.detectAnomalies not implemented — 请接入真实 LLM API');
  }

  async suggestResearch(
    _target: { type: 'teacher' | 'class' | 'subject'; id: string },
    _ctx: GovernanceContext,
  ): Promise<ResearchSuggestion> {
    throw new Error('GovernanceAdapter.suggestResearch not implemented — 请接入真实 LLM API');
  }
}
