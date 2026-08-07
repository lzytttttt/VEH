import { useEffect, useMemo, useState } from 'react';
import { getGovernanceProvider } from '../harness/providerRegistry';
import { useGovernanceStore } from '../stores/governanceStore';
import type { GovernanceChunk, GovernanceContext } from '../harness/types';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';
import BarChart from '../components/BarChart';
import MultiRadarChart, { type MultiRadarSeries } from '../components/MultiRadarChart';
import AgentInsightStream from '../components/AgentInsightStream';
import GovernanceChat from '../components/GovernanceChat';
import { useIsMobile } from '../lib/useIsMobile';
import MobileTabBar from '../components/MobileTabBar';

const SHORT_TERM: Record<string, string> = {
  'term-2024-fall': '24秋',
  'term-2025-spring': '25春',
  'term-2025-fall': '25秋',
};

const RADAR_COLORS = ['#000080', '#008000', '#FF0000', '#800080', '#808000'];
const RADAR_AXES = [
  { key: 'teaching', label: '教学质量' },
  { key: 'engagement', label: '参与度' },
  { key: 'interaction', label: '互动性' },
  { key: 'compliance', label: '规范性' },
  { key: 'innovation', label: '创新性' },
];

/**
 * 校长驾驶舱 — AI Agent 导向三区布局
 * Layer2 聚合图表 + Layer3 Agent 洞察流(streamBriefing) + Agent 对话(streamInsight)
 */
export default function DashboardApp() {
  const buildCtx = useGovernanceStore((s) => s.buildGovernanceContext);
  const ctx: GovernanceContext = useMemo(() => buildCtx(), [buildCtx]);
  const ov = ctx.aggregates.schoolOverview;

  const [briefingChunks, setBriefingChunks] = useState<GovernanceChunk[]>([]);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  const teachers = ctx.aggregates.teacherComparison;
  // 默认选综合分前 3 名教师
  useEffect(() => {
    if (selectedTeachers.length === 0 && teachers.length > 0) {
      const top3 = [...teachers].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3).map((t) => t.teacherId);
      setSelectedTeachers(top3);
    }
  }, [teachers, selectedTeachers.length]);

  // 启动 Agent 治理简报流
  useEffect(() => {
    let aborted = false;
    setBriefingChunks([]);
    setBriefingLoading(true);
    const provider = getGovernanceProvider();
    (async () => {
      try {
        for await (const chunk of provider.streamBriefing(ctx)) {
          if (aborted) break;
          setBriefingChunks((prev) => [...prev, chunk]);
        }
      } catch (e) {
        console.error('streamBriefing failed', e);
      }
      if (!aborted) setBriefingLoading(false);
    })();
    return () => { aborted = true; };
  }, [ctx]);

  // 图表数据
  const trendData = ctx.aggregates.trends.map((t) => ({ label: SHORT_TERM[t.termId] ?? t.termId, score: t.avgScore }));
  const subjectData = ctx.aggregates.subjectComparison.map((s) => ({ label: s.subjectName, value: s.avgScore }));
  const classData = ctx.aggregates.classComparison.map((c) => ({ label: c.className, value: c.avgScore }));

  const radarSeries: MultiRadarSeries[] = teachers
    .filter((t) => selectedTeachers.includes(t.teacherId))
    .map((t, i) => ({
      name: t.teacherName,
      color: RADAR_COLORS[i % RADAR_COLORS.length],
      data: RADAR_AXES.map((a) => ({ axis: a.label, value: (t.metrics as Record<string, number>)[a.key] })),
    }));

  const toggleTeacher = (id: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState('charts');

  // —— 面板内容（移动端/桌面端共用） ——
  const chartsPanel = (
    <div className="flex flex-col gap-2" style={{ flex: isMobile ? undefined : '0 0 42%' }}>
      <div className="win-fieldset">
        <legend>📈 学期趋势</legend>
        <TrendChart data={trendData} height={120} />
      </div>
      <div className="win-fieldset">
        <legend>📚 学科均分对比</legend>
        <BarChart data={subjectData} height={120} />
      </div>
    </div>
  );

  const agentBriefingPanel = (
    <div className="win-fieldset flex flex-col" style={{ flex: isMobile ? undefined : '0 0 30%' }}>
      <legend>🤖 Agent 治理简报</legend>
      <AgentInsightStream chunks={briefingChunks} loading={briefingLoading} />
    </div>
  );

  const agentChatPanel = (
    <div style={{ flex: isMobile ? undefined : '1 1 26%' }}>
      <GovernanceChat ctx={ctx} />
    </div>
  );

  const classRankPanel = (
    <div className="win-fieldset" style={{ flex: isMobile ? undefined : '1 1 50%' }}>
      <legend>🏫 班级综合排名</legend>
      <BarChart data={classData} height={160} layout="horizontal" />
    </div>
  );

  const teacherRadarPanel = (
    <div className="win-fieldset" style={{ flex: isMobile ? undefined : '1 1 50%' }}>
      <legend>👨‍🏫 教师能力对比（选 {selectedTeachers.length}/3）</legend>
      <div className="flex flex-wrap gap-1 mb-1">
        {teachers.map((t) => (
          <button
            key={t.teacherId}
            className="win-button"
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              background: selectedTeachers.includes(t.teacherId) ? '#000080' : undefined,
              color: selectedTeachers.includes(t.teacherId) ? '#fff' : undefined,
            }}
            onClick={() => toggleTeacher(t.teacherId)}
          >
            {t.teacherName}
          </button>
        ))}
      </div>
      <MultiRadarChart series={radarSeries} height={140} />
    </div>
  );

  const statCards = (
    <>
      <StatCard label="综合评分" value={`${(ov.totalScore * 100).toFixed(1)}%`} trend={ov.scoreChange} />
      <StatCard label="学期环比" value={`${ov.scoreChange >= 0 ? '+' : ''}${(ov.scoreChange * 100).toFixed(1)}%`} hint="较上学期" />
      <StatCard label="分析覆盖率" value={`${(ov.coverageRate * 100).toFixed(0)}%`} hint={`${ov.analyzedSessions}/${ov.totalSessions} 节`} />
      <StatCard label="活跃教师" value={`${ov.activeTeachers} 名`} />
      <StatCard label="活跃班级" value={`${ov.activeClasses} 个`} />
    </>
  );

  return (
    <div className="flex flex-col gap-2 p-2" style={{ fontSize: '11px', height: '100%', overflow: 'auto' }}>
      {/* 顶部概览栏 —— 移动端横滑 */}
      <div className="flex gap-2 overflow-x-auto" style={{ flexWrap: isMobile ? 'nowrap' : 'wrap', scrollbarWidth: 'none' }}>
        {statCards}
      </div>

      {isMobile ? (
        <>
          <MobileTabBar
            tabs={[
              { id: 'charts', label: '图表', icon: '📈' },
              { id: 'agent', label: 'Agent', icon: '🤖' },
              { id: 'compare', label: '对比', icon: '📊' },
            ]}
            activeId={mobileTab}
            onChange={setMobileTab}
          />
          <div className="flex-1 min-h-0 overflow-auto">
            {mobileTab === 'charts' && <div className="flex flex-col gap-2">{chartsPanel}</div>}
            {mobileTab === 'agent' && (
              <div className="flex flex-col gap-2">
                {agentBriefingPanel}
                {agentChatPanel}
              </div>
            )}
            {mobileTab === 'compare' && (
              <div className="flex flex-col gap-2">
                {classRankPanel}
                {teacherRadarPanel}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* 中部三栏 */}
          <div className="flex gap-2" style={{ minHeight: '240px' }}>
            {chartsPanel}
            {agentBriefingPanel}
            {agentChatPanel}
          </div>

          {/* 底部双栏 */}
          <div className="flex gap-2">
            {classRankPanel}
            {teacherRadarPanel}
          </div>
        </>
      )}
    </div>
  );
}
