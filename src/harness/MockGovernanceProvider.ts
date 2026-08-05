import type {
  AnomalyAlert,
  GovernanceChunk,
  GovernanceContext,
  GovernanceProvider,
  ResearchSuggestion,
} from './types';

/**
 * Mock Governance Provider
 *
 * 规则引擎驱动 + 流式输出：
 * - streamBriefing/streamInsight 复用 MockVLMProvider 的 sleep/yield 模式，增量 yield chunk
 * - detectAnomalies/suggestResearch 复用 CapabilityProvider 的 Promise 模式
 * - 规则引擎扫描 GovernanceContext.aggregates 生成洞察/预警/建议
 *
 * 接入真实 LLM 时换 GovernanceAdapter 即可，业务代码一行不改。
 */
export class MockGovernanceProvider implements GovernanceProvider {
  readonly name = 'MockGovernanceProvider (Rule Engine)';

  async *streamBriefing(ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    const { schoolOverview: ov, trends, subjectComparison, classComparison, teacherComparison } = ctx.aggregates;
    const chunks = buildBriefingChunks(ov, trends, subjectComparison, classComparison, teacherComparison);
    for (const c of chunks) {
      await sleep(280);
      yield c;
    }
  }

  async *streamInsight(query: string, ctx: GovernanceContext): AsyncIterable<GovernanceChunk> {
    const chunks = matchInsight(query, ctx);
    for (const c of chunks) {
      await sleep(320);
      yield c;
    }
  }

  async detectAnomalies(ctx: GovernanceContext): Promise<AnomalyAlert[]> {
    return detectAnomalyRules(ctx);
  }

  async suggestResearch(
    target: { type: 'teacher' | 'class' | 'subject'; id: string },
    ctx: GovernanceContext,
  ): Promise<ResearchSuggestion> {
    return suggestResearchRule(target, ctx);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const fmt = (n: number) => n.toFixed(2);

/** 构建治理简报 chunk 序列 */
function buildBriefingChunks(
  ov: GovernanceContext['aggregates']['schoolOverview'],
  trends: GovernanceContext['aggregates']['trends'],
  subjects: GovernanceContext['aggregates']['subjectComparison'],
  classes: GovernanceContext['aggregates']['classComparison'],
  teachers: GovernanceContext['aggregates']['teacherComparison'],
): GovernanceChunk[] {
  const out: GovernanceChunk[] = [];
  const dir = ov.scoreChange >= 0 ? '上升' : '下降';
  const arrow = ov.scoreChange >= 0 ? '↑' : '↓';
  out.push({
    type: 'insight',
    content: `本期全校教学综合评分 ${fmt(ov.totalScore)}（${pct(ov.totalScore)}），环比${dir} ${Math.abs(ov.scoreChange).toFixed(2)} ${arrow}。`,
    severity: ov.scoreChange >= 0 ? 'info' : 'warning',
  });
  out.push({
    type: 'metric_ref',
    content: `课堂分析覆盖率 ${pct(ov.coverageRate)}（${ov.analyzedSessions}/${ov.totalSessions} 节），活跃教师 ${ov.activeTeachers} 名，活跃班级 ${ov.activeClasses} 个。`,
    refId: 'school-overview',
  });
  // 趋势
  const trendStr = trends.map((t) => `${t.termName.split('学年')[0]}:${fmt(t.avgScore)}`).join(' → ');
  const trendDir = trends.length >= 2 && trends[trends.length - 1].avgScore >= trends[0].avgScore ? '稳步上升' : '需关注';
  out.push({
    type: 'insight',
    content: `多学期趋势：${trendStr}，整体${trendDir}。`,
    refId: 'trends',
  });
  // 学科对比
  const sortedSubj = [...subjects].sort((a, b) => b.avgScore - a.avgScore);
  const topSubj = sortedSubj[0];
  const lowSubj = sortedSubj[sortedSubj.length - 1];
  out.push({
    type: 'insight',
    content: `学科对比：${topSubj.subjectName}领先（${fmt(topSubj.avgScore)}），${lowSubj.subjectName}待提升（${fmt(lowSubj.avgScore)}）。`,
    refId: 'subject-comparison',
  });
  // 班级排名
  const sortedClass = [...classes].sort((a, b) => b.avgScore - a.avgScore);
  out.push({
    type: 'alert',
    content: `班级排名：最佳 ${sortedClass[0].className}（${fmt(sortedClass[0].avgScore)}）；待提升 ${sortedClass[sortedClass.length - 1].className}（${fmt(sortedClass[sortedClass.length - 1].avgScore)}）。`,
    severity: sortedClass[sortedClass.length - 1].avgScore < 0.8 ? 'warning' : 'info',
    refId: 'class-comparison',
  });
  // 教师异常预警
  const weakTeachers = teachers.filter((t) => Math.min(...Object.values(t.metrics)) < 0.78);
  if (weakTeachers.length > 0) {
    const names = weakTeachers.map((t) => `${t.teacherName}(${t.subject})`).join('、');
    out.push({
      type: 'alert',
      content: `师资预警：${names} 存在短板维度（<78%），建议安排针对性教研。`,
      severity: 'warning',
    });
  }
  // 建议
  out.push({
    type: 'suggestion',
    content: `教研建议：以 ${topSubj.subjectName} 组为标杆开展跨学科教研分享；针对 ${lowSubj.subjectName} 组组织专项能力提升培训。`,
    severity: 'info',
  });
  return out;
}

/** 对话式洞察：关键词匹配 */
function matchInsight(query: string, ctx: GovernanceContext): GovernanceChunk[] {
  const { schoolOverview: ov, trends, subjectComparison, classComparison, teacherComparison } = ctx.aggregates;
  const q = query.toLowerCase();
  if (/(趋势|走势|变化|发展)/.test(q)) {
    const trendStr = trends.map((t) => `${t.termName}:${fmt(t.avgScore)}`).join(' → ');
    return [{ type: 'insight', content: `多学期教学质量趋势：${trendStr}。`, refId: 'trends' }];
  }
  if (/(班级|对比|排名|哪个班)/.test(q)) {
    const sorted = [...classComparison].sort((a, b) => b.avgScore - a.avgScore);
    const top3 = sorted.slice(0, 3).map((c) => `${c.className}(${fmt(c.avgScore)})`).join('、');
    return [{ type: 'insight', content: `班级综合分排名前三：${top3}。末位 ${sorted[sorted.length - 1].className}（${fmt(sorted[sorted.length - 1].avgScore)}）。`, refId: 'class-comparison' }];
  }
  if (/(教师|老师|师资|哪个老师)/.test(q)) {
    const sorted = [...teacherComparison].sort((a, b) => b.avgScore - a.avgScore);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    return [{ type: 'insight', content: `教师综合分：最高 ${top.teacherName}(${top.subject},${fmt(top.avgScore)})，最低 ${bottom.teacherName}(${bottom.subject},${fmt(bottom.avgScore)})。`, refId: 'teacher-comparison' }];
  }
  if (/(学科|科目|哪门)/.test(q)) {
    const sorted = [...subjectComparison].sort((a, b) => b.avgScore - a.avgScore);
    return [{ type: 'insight', content: `学科均分：${sorted.map((s) => `${s.subjectName}(${fmt(s.avgScore)})`).join('、')}。`, refId: 'subject-comparison' }];
  }
  if (/(建议|改进|提升|教研|怎么办)/.test(q)) {
    const lowSubj = [...subjectComparison].sort((a, b) => a.avgScore - b.avgScore)[0];
    return [{ type: 'suggestion', content: `建议优先关注 ${lowSubj.subjectName} 学科组，组织专项教研；同时推广标杆学科经验。`, severity: 'info' }];
  }
  if (/(异常|问题|预警|风险|下滑)/.test(q)) {
    const anomalies = detectAnomalyRules(ctx);
    if (anomalies.length === 0) return [{ type: 'insight', content: '当前未检测到明显异常。' }];
    return anomalies.slice(0, 3).map((a) => ({ type: 'alert' as const, content: `${a.target.name}：${a.description}`, severity: a.severity }));
  }
  return [{ type: 'insight', content: `全校综合评分 ${fmt(ov.totalScore)}，覆盖率 ${pct(ov.coverageRate)}。可追问"班级排名""教师对比""学科分析""异常预警""教研建议"等。` }];
}

/** 异常预警规则扫描 */
function detectAnomalyRules(ctx: GovernanceContext): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const { classComparison, teacherComparison, schoolOverview } = ctx.aggregates;
  // 班级评分下滑
  for (const c of classComparison) {
    if (c.avgScore < 0.8) {
      alerts.push({
        id: `alert-class-${c.classId}`,
        type: 'score_drop',
        target: { type: 'class', id: c.classId, name: c.className },
        severity: c.avgScore < 0.75 ? 'critical' : 'warning',
        description: `${c.className} 综合评分 ${fmt(c.avgScore)} 低于 80% 阈值`,
        metric: 'avgScore',
        value: c.avgScore,
        threshold: 0.8,
      });
    }
    if (c.trend < -0.02) {
      alerts.push({
        id: `alert-trend-${c.classId}`,
        type: 'score_drop',
        target: { type: 'class', id: c.classId, name: c.className },
        severity: 'warning',
        description: `${c.className} 环比下滑 ${Math.abs(c.trend).toFixed(2)}，需关注`,
        metric: 'trend',
        value: c.trend,
        threshold: -0.02,
      });
    }
  }
  // 教师短板维度
  for (const t of teacherComparison) {
    const dims = Object.entries(t.metrics) as [string, number][];
    for (const [dim, val] of dims) {
      if (val < 0.78) {
        const dimName: Record<string, string> = { teaching: '教学质量', engagement: '参与度', interaction: '互动性', compliance: '规范性', innovation: '创新性' };
        alerts.push({
          id: `alert-teacher-${t.teacherId}-${dim}`,
          type: dim === 'compliance' ? 'compliance_risk' : 'low_engagement',
          target: { type: 'teacher', id: t.teacherId, name: t.teacherName },
          severity: val < 0.72 ? 'critical' : 'warning',
          description: `${t.teacherName}(${t.subject}) 的${dimName[dim] ?? dim}仅 ${fmt(val)}，低于 78% 阈值`,
          metric: dim,
          value: val,
          threshold: 0.78,
        });
      }
    }
  }
  // 覆盖率缺口
  if (schoolOverview.coverageRate < 0.6) {
    alerts.push({
      id: 'alert-coverage',
      type: 'coverage_gap',
      target: { type: 'class', id: 'school', name: '全校' },
      severity: 'warning',
      description: `课堂分析覆盖率仅 ${pct(schoolOverview.coverageRate)}，建议扩大录播覆盖`,
      metric: 'coverageRate',
      value: schoolOverview.coverageRate,
      threshold: 0.6,
    });
  }
  return alerts;
}

/** 教研建议规则 */
function suggestResearchRule(
  target: { type: 'teacher' | 'class' | 'subject'; id: string },
  ctx: GovernanceContext,
): ResearchSuggestion {
  const dimName: Record<string, string> = { teaching: '教学质量', engagement: '参与度', interaction: '互动性', compliance: '规范性', innovation: '创新性' };
  const dimTip: Record<string, string> = {
    teaching: '建议参加教学设计培训，优化讲解节奏与重难点突破',
    engagement: '建议增加课堂互动环节，引入提问与小组讨论',
    interaction: '建议加强师生问答，关注学生个体参与度',
    compliance: '建议规范课堂流程，参加安全/规范专项培训',
    innovation: '建议尝试信息化教学手段，参与创新教研活动',
  };
  if (target.type === 'teacher') {
    const t = ctx.aggregates.teacherComparison.find((x) => x.teacherId === target.id);
    if (t) {
      const dims = Object.entries(t.metrics) as [string, number][];
      const [weakest, val] = dims.sort((a, b) => a[1] - b[1])[0];
      return {
        target: { type: 'teacher', id: t.teacherId, name: t.teacherName },
        dimension: dimName[weakest] ?? weakest,
        currentScore: val,
        suggestion: `${t.teacherName} 最薄弱维度为${dimName[weakest] ?? weakest}（${fmt(val)}）。${dimTip[weakest] ?? ''}`,
        priority: val < 0.72 ? 'high' : val < 0.78 ? 'medium' : 'low',
      };
    }
  }
  if (target.type === 'class') {
    const c = ctx.aggregates.classComparison.find((x) => x.classId === target.id);
    if (c) {
      return {
        target: { type: 'class', id: c.classId, name: c.className },
        dimension: '综合评分',
        currentScore: c.avgScore,
        suggestion: `${c.className} 综合评分 ${fmt(c.avgScore)}。建议班主任与任课教师联合分析学情，针对性改进课堂互动。`,
        priority: c.avgScore < 0.78 ? 'high' : 'medium',
      };
    }
  }
  if (target.type === 'subject') {
    const s = ctx.aggregates.subjectComparison.find((x) => x.subjectId === target.id);
    if (s) {
      return {
        target: { type: 'subject', id: s.subjectId, name: s.subjectName },
        dimension: '学科均分',
        currentScore: s.avgScore,
        suggestion: `${s.subjectName} 学科组均分 ${fmt(s.avgScore)}。建议组织组内听评课，推广优秀教学经验。`,
        priority: s.avgScore < 0.8 ? 'high' : 'medium',
      };
    }
  }
  return {
    target: { type: target.type, id: target.id, name: '未知目标' },
    dimension: '综合',
    currentScore: 0,
    suggestion: '未找到目标数据，请确认目标 ID。',
    priority: 'low',
  };
}
