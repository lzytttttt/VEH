import type {
  AnomalyAlert,
  GovernanceChunk,
  GovernanceContext,
  GovernanceProvider,
  ResearchSuggestion,
} from '../types';
import { streamChatCompletion, createAbortController } from './sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';
import { MockGovernanceProvider } from '../MockGovernanceProvider';

/**
 * 治理 LLM API Adapter
 *
 * 设计取舍：
 * - streamBriefing / streamInsight：真实 LLM SSE 流式（治理洞察的核心价值）
 * - detectAnomalies / suggestResearch：委托 MockGovernanceProvider 规则引擎
 *   （这些方法返回结构化数据 AnomalyAlert[] / ResearchSuggestion，
 *    基于真实聚合数据规则扫描，比 LLM JSON mode 更可靠；
 *    LLM 适合生成自然语言洞察，不适合精确数据扫描）
 *
 * 配置从 apiConfigStore 的 'governance' 条目懒读取（调用时取最新）。
 */
export class GovernanceAdapter implements GovernanceProvider {
  readonly name = 'Governance LLM Adapter';
  private mock = new MockGovernanceProvider();
  private controllers = new Map<string, AbortController>();

  private cfg() {
    const c = getProviderConfig('governance');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'deepseek-v4-flash',
    };
  }

  /** 流式治理简报：真实 LLM SSE */
  async *streamBriefing(ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    const sessionId = `gov-brief-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    const { schoolOverview: ov, trends, subjectComparison, classComparison, teacherComparison } = ctx.aggregates;

    const dataSummary = [
      `全校综合评分：${ov.totalScore.toFixed(2)}（覆盖率 ${Math.round(ov.coverageRate * 100)}%，${ov.analyzedSessions}/${ov.totalSessions} 节）`,
      `环比变化：${ov.scoreChange >= 0 ? '+' : ''}${ov.scoreChange.toFixed(2)}`,
      `多学期趋势：${trends.map((t) => `${t.termName}=${t.avgScore.toFixed(2)}`).join(' → ')}`,
      `学科对比：${subjectComparison.map((s) => `${s.subjectName}=${s.avgScore.toFixed(2)}`).join('、')}`,
      `班级排名：${[...classComparison].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3).map((c) => `${c.className}(${c.avgScore.toFixed(2)})`).join('、')}`,
      `教师数：${teacherComparison.length}，活跃班级 ${ov.activeClasses} 个`,
    ].join('\n');

    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是学校治理 AI 助手。根据聚合数据生成本期治理简报，包含：
1. 全校综合评分解读（环比变化含义）
2. 多学期趋势分析
3. 学科对比亮点与短板
4. 班级排名关键发现
5. 教研建议

数据：
${dataSummary}

要求：
- 用中文，分点输出，每点一行
- 直接给出简报文本，不要前缀/解释
- 数据引用要准确，结合给出的数字`,
          },
          { role: 'user', content: '请生成本期治理简报' },
        ],
        bodyOverrides: { temperature: 0.4 },
        signal: controller.signal,
      });

      let buf = '';
      for await (const tok of tokens) {
        if (controller.signal.aborted) break;
        buf += tok;
        if (buf.includes('\n')) {
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // 简单分类：含"建议"/"推荐" → suggestion；含"预警"/"风险"/"下滑" → alert；其余 → insight
            const type: GovernanceChunk['type'] = /建议|推荐|应该|可以/.test(trimmed)
              ? 'suggestion'
              : /预警|风险|下滑|异常|低于|待提升/.test(trimmed)
                ? 'alert'
                : 'insight';
            const severity: GovernanceChunk['severity'] = type === 'alert' ? 'warning' : 'info';
            yield { type, content: trimmed, severity };
          }
        }
      }
      if (buf.trim()) {
        yield { type: 'insight', content: buf.trim() };
      }
    } catch (e) {
      // LLM 失败时降级到 Mock 规则引擎简报
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('GovernanceAdapter.streamBriefing LLM failed, falling back to rule engine:', msg);
      for await (const c of this.mock.streamBriefing(ctx)) {
        yield c;
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  /** 对话式洞察：真实 LLM SSE */
  async *streamInsight(query: string, ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    const sessionId = `gov-insight-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    const { schoolOverview: ov, trends, subjectComparison, classComparison, teacherComparison } = ctx.aggregates;

    const dataSummary = [
      `全校综合评分：${ov.totalScore.toFixed(2)}，覆盖率 ${Math.round(ov.coverageRate * 100)}%`,
      `趋势：${trends.map((t) => `${t.termName}=${t.avgScore.toFixed(2)}`).join(' → ')}`,
      `学科：${subjectComparison.map((s) => `${s.subjectName}=${s.avgScore.toFixed(2)}`).join('、')}`,
      `班级：${classComparison.map((c) => `${c.className}=${c.avgScore.toFixed(2)}`).join('、')}`,
      `教师：${teacherComparison.map((t) => `${t.teacherName}(${t.subject})=${t.avgScore.toFixed(2)}`).join('、')}`,
    ].join('\n');

    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是学校治理 AI 助手。根据用户提问，结合治理数据给出简洁洞察。

数据：
${dataSummary}

要求：
- 用中文，简洁回答，2-4 句话
- 引用具体数据支撑结论
- 直接输出回答，不要前缀`,
          },
          { role: 'user', content: query },
        ],
        bodyOverrides: { temperature: 0.4 },
        signal: controller.signal,
      });

      let buf = '';
      for await (const tok of tokens) {
        if (controller.signal.aborted) break;
        buf += tok;
        if (buf.includes('\n')) {
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim()) yield { type: 'insight', content: line.trim() };
          }
        }
      }
      if (buf.trim()) yield { type: 'insight', content: buf.trim() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('GovernanceAdapter.streamInsight LLM failed, falling back:', msg);
      for await (const c of this.mock.streamInsight(query, ctx)) {
        yield c;
      }
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  /** 异常预警：委托 Mock 规则引擎（基于真实聚合数据精确扫描） */
  async detectAnomalies(ctx: GovernanceContext): Promise<AnomalyAlert[]> {
    return this.mock.detectAnomalies(ctx);
  }

  /** 教研建议：委托 Mock 规则引擎（基于目标真实数据生成） */
  async suggestResearch(
    target: { type: 'teacher' | 'class' | 'subject'; id: string },
    ctx: GovernanceContext,
  ): Promise<ResearchSuggestion> {
    return this.mock.suggestResearch(target, ctx);
  }

  cancel(sessionId: string): void {
    const c = this.controllers.get(sessionId);
    if (c) {
      c.abort();
      this.controllers.delete(sessionId);
    }
  }
}
