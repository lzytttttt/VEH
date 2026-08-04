import { useMemo, useState } from 'react';
import { getScript } from '../harness/MockVLMProvider';
import type { ScenarioType } from '../harness/types';
import type { UserRole } from '../harness/types';
import { useSessionStore } from '../stores/sessionStore';
import { useProfileStore } from '../stores/profileStore';

interface Props {
  role: UserRole;
}

const SCENARIO_OPTIONS: { id: ScenarioType; label: string; icon: string; date: string }[] = [
  { id: 'classroom', label: '高一物理·牛顿第二定律', icon: '🏫', date: '2025-09-12' },
  { id: 'pe', label: '高二体育·篮球运球', icon: '⚽', date: '2025-09-15' },
  { id: 'lab', label: '高二化学·酸碱中和滴定', icon: '🔬', date: '2025-09-19' },
  { id: 'workshop', label: '实训车间·普通车削', icon: '🏭', date: '2025-09-22' },
  { id: 'microlesson', label: '高三数学·函数单调性', icon: '🎥', date: '2025-09-26' },
];

export default function ReportApp({ role }: Props) {
  const [scenario, setScenario] = useState<ScenarioType>('classroom');
  const script = getScript(scenario);
  const opt = SCENARIO_OPTIONS.find((o) => o.id === scenario)!;
  const m = script.metrics;

  const totalScore = useMemo(
    () => (m.teaching + m.engagement + m.interaction + m.compliance + m.innovation) / 5,
    [m]
  );

  return (
    <div className="flex flex-col h-full bg-win-gray">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">📋 分析报告</span>
        <span className="text-gray-600">|</span>
        <span>场景:</span>
        <select
          className="win-input"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioType)}
          style={{ fontSize: '11px', padding: '1px 4px' }}
        >
          {SCENARIO_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="win-text-disabled">模板: {role === 'teacher' ? '教师版' : '学生版'}</span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {role === 'teacher' ? (
          <TeacherReport script={script} scenarioOpt={opt} totalScore={totalScore} />
        ) : (
          <StudentReport script={script} scenarioOpt={opt} />
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-2 px-3 py-1" style={{ background: '#c0c0c0', borderTop: '1px solid #fff' }}>
        <button className="win-button" style={{ fontSize: '11px', padding: '2px 10px' }} onClick={() => window.print()}>
          🖨️ 打印
        </button>
        <ExportButton scenario={scenario} />
      </div>
    </div>
  );
}

function ExportButton({ scenario }: { scenario: ScenarioType }) {
  const recordSession = useSessionStore((s) => s.recordSession);
  const refreshProfile = useProfileStore((s) => s.refresh);
  const [saved, setSaved] = useState(false);

  const handleExport = () => {
    recordSession(scenario);
    refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <button className="win-button" style={{ fontSize: '11px', padding: '2px 10px' }} onClick={handleExport}>
      {saved ? '✅ 已归档' : '💾 导出归档'}
    </button>
  );
}

function TeacherReport({ script, scenarioOpt, totalScore }: {
  script: ReturnType<typeof getScript>;
  scenarioOpt: { label: string; icon: string; date: string };
  totalScore: number;
}) {
  const m = script.metrics;
  const cards = [
    { label: '教学质量', value: m.teaching, color: '#000080' },
    { label: '学生参与度', value: m.engagement, color: '#008000' },
    { label: '互动性', value: m.interaction, color: '#808000' },
    { label: '规范性', value: m.compliance, color: '#008080' },
    { label: '创新性', value: m.innovation, color: '#800080' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* 报告头 */}
      <div className="win-raised p-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="win-text-bold" style={{ fontSize: '16px', color: '#000080' }}>
              {scenarioOpt.icon} {script.title} · 教学分析报告
            </h1>
            <div className="win-text" style={{ fontSize: '11px' }}>
              教师：李建国（高级教师） · 日期：{scenarioOpt.date} · 时长：{Math.floor(script.duration / 60)}分{script.duration % 60}秒 · 学生：{script.students.length}人
            </div>
          </div>
          <div className="win-sunken text-center" style={{ padding: '8px 16px', background: '#fff' }}>
            <div style={{ fontSize: '11px', color: '#808080' }}>综合评分</div>
            <div className="win-text-bold" style={{ fontSize: '24px', color: '#000080' }}>{(totalScore * 100).toFixed(0)}</div>
            <div style={{ fontSize: '10px', color: totalScore >= 0.85 ? '#008000' : totalScore >= 0.7 ? '#808000' : '#ff0000' }}>
              {totalScore >= 0.85 ? '优秀' : totalScore >= 0.7 ? '良好' : '需提升'}
            </div>
          </div>
        </div>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-5 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="win-raised p-2 text-center">
            <div style={{ fontSize: '11px', color: '#808080' }}>{c.label}</div>
            <div className="win-text-bold" style={{ fontSize: '18px', color: c.color }}>{(c.value * 100).toFixed(0)}</div>
            <div className="win-sunken" style={{ height: '6px', background: '#fff', marginTop: '4px' }}>
              <div style={{ width: `${c.value * 100}%`, height: '100%', background: c.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* 详细分析 */}
      <div className="win-fieldset">
        <legend>教学效果分析</legend>
        <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.6' }}>
          本节课{scenarioOpt.label}整体表现{totalScore >= 0.85 ? '优秀' : '良好'}。教学过程结构清晰，板书与实验演示相结合，知识点讲解准确。
          {m.engagement >= 0.85 ? '学生参与度高，互动质量优秀。' : '学生参与度有提升空间，建议增加提问频次。'}
          {m.compliance >= 0.9 ? '操作规范性达标。' : '操作规范性需加强监管。'}
        </div>
      </div>

      <div className="win-fieldset">
        <legend>学生参与度分析</legend>
        <div className="grid grid-cols-2 gap-2" style={{ fontSize: '11px' }}>
          {script.students.map((s) => {
            const avg = s.timeline.reduce((a, p) => a + p.attention, 0) / s.timeline.length;
            return (
              <div key={s.id} className="win-sunken bg-white p-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center justify-center text-white" style={{ width: '18px', height: '18px', background: s.avatarColor, fontSize: '10px' }}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="win-text-bold">{s.name}</div>
                  <div className="flex-1 text-right" style={{ color: avg >= 0.8 ? '#008000' : avg >= 0.6 ? '#808000' : '#ff0000' }}>
                    均值 {(avg * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="text-gray-700" style={{ fontSize: '10px', lineHeight: '1.4' }}>{s.feedback}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="win-fieldset">
        <legend>改进建议</legend>
        <ul className="list-disc pl-5" style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <li>板书阶段（30秒前后）建议增加提问介入，提升部分走神学生的参与度</li>
          <li>分组练习环节可引入小组竞赛机制，强化合作意识</li>
          <li>课后建议针对注意度低于 60% 的学生进行单独辅导</li>
          <li>实验/操作环节增加安全提示的复述，确保规范内化</li>
        </ul>
      </div>
    </div>
  );
}

function StudentReport({ script, scenarioOpt }: {
  script: ReturnType<typeof getScript>;
  scenarioOpt: { label: string; icon: string; date: string };
}) {
  // 学生视角聚焦 s1（学生默认账号）
  const me = script.students[0];
  const avgAttention = me ? me.timeline.reduce((a, p) => a + p.attention, 0) / me.timeline.length : 0;
  const knowledgeNodes = script.wiki.nodes.length;
  const mastered = Math.floor(knowledgeNodes * 0.6);

  return (
    <div className="flex flex-col gap-3">
      <div className="win-raised p-3">
        <h1 className="win-text-bold" style={{ fontSize: '16px', color: '#008000' }}>
          {scenarioOpt.icon} {script.title} · 我的课堂回顾
        </h1>
        <div className="win-text" style={{ fontSize: '11px' }}>
          学生：张明（高二·三班） · 日期：{scenarioOpt.date} · 时长：{Math.floor(script.duration / 60)}分{script.duration % 60}秒
        </div>
      </div>

      {/* 我的指标卡片 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="win-raised p-2 text-center">
          <div style={{ fontSize: '11px', color: '#808080' }}>平均注意度</div>
          <div className="win-text-bold" style={{ fontSize: '20px', color: '#000080' }}>{(avgAttention * 100).toFixed(0)}%</div>
        </div>
        <div className="win-raised p-2 text-center">
          <div style={{ fontSize: '11px', color: '#808080' }}>知识点掌握</div>
          <div className="win-text-bold" style={{ fontSize: '20px', color: '#008000' }}>{mastered}/{knowledgeNodes}</div>
        </div>
        <div className="win-raised p-2 text-center">
          <div style={{ fontSize: '11px', color: '#808080' }}>互动次数</div>
          <div className="win-text-bold" style={{ fontSize: '20px', color: '#808000' }}>
            {me?.timeline.filter(t => t.state === '提问' || t.state === '讨论').length ?? 0}
          </div>
        </div>
      </div>

      <div className="win-fieldset">
        <legend>我的状态时间线</legend>
        <div className="grid grid-cols-5 gap-1" style={{ fontSize: '11px' }}>
          {me?.timeline.map((p, i) => (
            <div key={i} className="win-sunken bg-white p-1 text-center">
              <div style={{ fontSize: '10px', color: '#808080' }}>{Math.floor(p.t / 60)}:{(p.t % 60).toString().padStart(2, '0')}</div>
              <div className="win-text-bold" style={{ fontSize: '10px', color: p.attention >= 0.8 ? '#008000' : p.attention >= 0.6 ? '#808000' : '#ff0000' }}>
                {p.state}
              </div>
              <div style={{ fontSize: '10px' }}>{(p.attention * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="win-fieldset">
        <legend>知识点掌握情况</legend>
        <div className="win-sunken bg-white p-2" style={{ fontSize: '11px' }}>
          {script.wiki.nodes.map((n) => {
            const mastery = ((n.title.length * 7) % 41) / 40;
            return (
              <div key={n.id} className="flex items-center gap-2 py-1">
                <span style={{ fontSize: '12px' }}>📖</span>
                <div className="flex-1 truncate">{n.title}</div>
                <div className="win-sunken" style={{ width: '80px', height: '8px', padding: '1px' }}>
                  <div style={{ width: `${mastery * 100}%`, height: '100%', background: mastery >= 0.6 ? '#008000' : mastery >= 0.3 ? '#808000' : '#ff0000' }} />
                </div>
                <span style={{ fontSize: '10px', color: mastery >= 0.6 ? '#008000' : mastery >= 0.3 ? '#808000' : '#ff0000' }}>
                  {(mastery * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="win-fieldset">
        <legend>AI 学习建议</legend>
        <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.6' }}>
          {me?.feedback}
          <br /><br />
          建议结合知识 WIKI 中的 AI 助手，针对掌握度低于 60% 的知识点进行重点复习。可点击课堂引用片段跳转回放对应讲解位置。
        </div>
      </div>
    </div>
  );
}
