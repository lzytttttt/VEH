import { useEffect, useMemo, useState } from 'react';
import { getGovernanceProvider } from '../harness/providerRegistry';
import { useGovernanceStore } from '../stores/governanceStore';
import type { GovernanceChunk, GovernanceContext } from '../harness/types';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import PieChart, { type PieDatum } from '../components/PieChart';
import TrendChart from '../components/TrendChart';
import AgentInsightStream from '../components/AgentInsightStream';

const SHORT_TERM: Record<string, string> = {
  'term-2024-fall': '24秋',
  'term-2025-spring': '25春',
  'term-2025-fall': '25秋',
};

/**
 * 年级分析台 — 图表 + Agent 年级诊断洞察(streamBriefing)
 * 聚焦年级视角：班级对比 / 学科对比 / 群体分布 / 进步趋势
 */
export default function GradeAnalysisApp() {
  const buildCtx = useGovernanceStore((s) => s.buildGovernanceContext);
  const ctx: GovernanceContext = useMemo(() => buildCtx(), [buildCtx]);

  const classes = ctx.aggregates.classComparison;
  const subjects = ctx.aggregates.subjectComparison;
  const trends = ctx.aggregates.trends;

  // 年级聚合
  const gradeAvg = classes.length ? classes.reduce((s, c) => s + c.avgScore, 0) / classes.length : 0;
  const totalStudents = classes.reduce((s, c) => s + c.studentCount, 0);

  // 群体分布
  const distribution: PieDatum[] = [
    { name: '优秀(≥85%)', value: classes.filter((c) => c.avgScore >= 0.85).length, color: '#008000' },
    { name: '良好(70-85%)', value: classes.filter((c) => c.avgScore >= 0.7 && c.avgScore < 0.85).length, color: '#808000' },
    { name: '待提升(<70%)', value: classes.filter((c) => c.avgScore < 0.7).length, color: '#FF0000' },
  ].filter((d) => d.value > 0);

  // 图表数据
  const classData = classes.map((c) => ({ label: c.className, value: c.avgScore }));
  const subjectData = subjects.map((s) => ({ label: s.subjectName, value: s.avgScore }));
  const trendData = trends.map((t) => ({ label: SHORT_TERM[t.termId] ?? t.termId, score: t.avgScore }));

  // Agent 年级诊断洞察流
  const [diagChunks, setDiagChunks] = useState<GovernanceChunk[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    setDiagChunks([]);
    setDiagLoading(true);
    const provider = getGovernanceProvider();
    (async () => {
      try {
        for await (const chunk of provider.streamBriefing(ctx)) {
          if (aborted) break;
          setDiagChunks((prev) => [...prev, chunk]);
        }
      } catch (e) {
        console.error('streamBriefing failed', e);
      }
      if (!aborted) setDiagLoading(false);
    })();
    return () => { aborted = true; };
  }, [ctx]);

  return (
    <div className="flex flex-col gap-2 p-2" style={{ fontSize: '11px', height: '100%', overflow: 'auto' }}>
      {/* 年级概览栏 */}
      <div className="flex gap-2 flex-wrap">
        <StatCard label="年级均分" value={`${(gradeAvg * 100).toFixed(1)}%`} />
        <StatCard label="班级数" value={`${classes.length} 个`} />
        <StatCard label="学生总数" value={`${totalStudents} 人`} />
        <StatCard label="授课学科" value={`${subjects.length} 门`} />
      </div>

      {/* 班级对比 */}
      <div className="win-fieldset">
        <legend>🏫 班级综合分对比</legend>
        <BarChart data={classData} height={160} layout="horizontal" />
      </div>

      {/* 双栏：学科对比 + 群体分布 */}
      <div className="flex gap-2">
        <div className="win-fieldset" style={{ flex: '1 1 50%' }}>
          <legend>📚 学科均分对比</legend>
          <BarChart data={subjectData} height={180} />
        </div>
        <div className="win-fieldset" style={{ flex: '1 1 50%' }}>
          <legend>🎯 班级群体分布</legend>
          <PieChart data={distribution} height={180} />
        </div>
      </div>

      {/* 学期进步趋势 */}
      <div className="win-fieldset">
        <legend>📈 学期进步趋势</legend>
        <TrendChart data={trendData} height={140} color="#000080" />
      </div>

      {/* Agent 年级诊断洞察 */}
      <div className="win-fieldset" style={{ minHeight: '140px', flexShrink: 0 }}>
        <legend>🤖 Agent 年级诊断洞察</legend>
        <AgentInsightStream chunks={diagChunks} loading={diagLoading} />
      </div>
    </div>
  );
}
