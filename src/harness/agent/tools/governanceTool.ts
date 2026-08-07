import type { ToolDefinition } from '../types';
import { getGovernanceProvider } from '../../providerRegistry';
import { useGovernanceStore } from '../../../stores/governanceStore';
import { retrieveContext } from '../../rag';

const ACTIONS = ['briefing', 'insight', 'anomalies'] as const;

/** 治理洞察工具：基于学校治理数据生成简报 / 对话洞察 / 异常预警 */
export function createGovernanceTool(): ToolDefinition {
  return {
    name: 'governanceInsight',
    description:
      '基于学校治理数据生成 AI 洞察。action=briefing 生成本期治理简报；action=insight 回答治理提问（需带 query）；action=anomalies 扫描异常预警。用于管理岗位的治理目标。',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ACTIONS, description: '洞察类型，默认 briefing' },
        query: { type: 'string', description: 'action=insight 时的提问' },
      },
    },
    async execute(args) {
      const action = (args.action as (typeof ACTIONS)[number]) ?? 'briefing';
      let ctx;
      try {
        ctx = useGovernanceStore.getState().buildGovernanceContext();
      } catch {
        return { action, note: '治理数据未就绪，请在治理应用中加载数据后再调用。' };
      }
      const provider = getGovernanceProvider();

      if (action === 'anomalies') {
        const alerts = await provider.detectAnomalies(ctx);
        return {
          action,
          alertCount: alerts.length,
          alerts: alerts.map((a) => ({
            type: a.type,
            target: a.target.name,
            severity: a.severity,
            description: a.description,
          })),
        };
      }

      const query = args.query ? String(args.query) : undefined;
      // RAG 注入：把检索到的相关知识拼入 query，让 LLM 看到旧简报/转录上下文
      const ragCtx = query ? await retrieveContext(query, 3) : '';
      const enrichedQuery = query && ragCtx ? `${query}\n\n（参考知识：${ragCtx}）` : query;
      const lines: string[] = [];
      const stream = enrichedQuery ? provider.streamInsight(enrichedQuery, ctx) : provider.streamBriefing(ctx);
      for await (const c of stream) {
        if (c.content) lines.push(c.content);
      }
      return {
        action,
        query,
        briefing: lines.join('\n'),
      };
    },
  };
}
