import { useMemo, useState } from 'react';
import { getScript } from '../harness/MockVLMProvider';
import type { ScenarioType, UserRole } from '../harness/types';
import RadarChart, { type RadarDatum } from '../components/RadarChart';
import TrendChart, { type TrendDatum } from '../components/TrendChart';

interface Props {
  role: UserRole;
}

const SCENARIOS: { id: ScenarioType; label: string; icon: string; date: string }[] = [
  { id: 'classroom', label: '物理·牛顿', icon: '🏫', date: '09-12' },
  { id: 'pe', label: '体育·运球', icon: '⚽', date: '09-15' },
  { id: 'lab', label: '化学·滴定', icon: '🔬', date: '09-19' },
  { id: 'workshop', label: '车削', icon: '🏭', date: '09-22' },
  { id: 'microlesson', label: '数学·函数', icon: '🎥', date: '09-26' },
];

export default function ProfileApp({ role }: Props) {
  const scripts = SCENARIOS.map((s) => ({ ...s, script: getScript(s.id) }));

  return (
    <div className="flex flex-col h-full bg-win-gray">
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">👤 {role === 'teacher' ? '教师画像档案' : '学生学情档案'}</span>
        <span className="text-gray-600">|</span>
        <span className="win-text-disabled">聚合 5 个场景会话</span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {role === 'teacher' ? <TeacherProfile scripts={scripts} /> : <StudentProfile scripts={scripts} />}
      </div>
    </div>
  );
}

function TeacherProfile({ scripts }: { scripts: { id: ScenarioType; label: string; icon: string; date: string; script: ReturnType<typeof getScript> }[] }) {
  const radarData: RadarDatum[] = useMemo(() => {
    const sum = scripts.reduce(
      (acc, s) => ({
        teaching: acc.teaching + s.script.metrics.teaching,
        engagement: acc.engagement + s.script.metrics.engagement,
        interaction: acc.interaction + s.script.metrics.interaction,
        compliance: acc.compliance + s.script.metrics.compliance,
        innovation: acc.innovation + s.script.metrics.innovation,
      }),
      { teaching: 0, engagement: 0, interaction: 0, compliance: 0, innovation: 0 }
    );
    const n = scripts.length;
    return [
      { axis: '教学质量', value: sum.teaching / n },
      { axis: '参与度', value: sum.engagement / n },
      { axis: '互动性', value: sum.interaction / n },
      { axis: '规范性', value: sum.compliance / n },
      { axis: '创新性', value: sum.innovation / n },
    ];
  }, [scripts]);

  const trend: TrendDatum[] = scripts.map((s) => {
    const m = s.script.metrics;
    return { label: s.date, score: (m.teaching + m.engagement + m.interaction + m.compliance + m.innovation) / 5 };
  });

  const overall = radarData.reduce((a, d) => a + d.value, 0) / radarData.length;
  const sorted = [...radarData].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 2);
  const weaknesses = sorted.slice(-2);

  return (
    <div className="flex flex-col gap-3">
      {/* 信息头 */}
      <div className="win-raised p-3 flex items-center gap-3">
        <div className="flex items-center justify-center text-white" style={{ width: '48px', height: '48px', background: '#000080', fontSize: '24px', fontWeight: 'bold' }}>
          李
        </div>
        <div className="flex-1">
          <h1 className="win-text-bold" style={{ fontSize: '18px' }}>李建国</h1>
          <div className="win-text" style={{ fontSize: '12px' }}>物理高级教师 · 教龄 12 年 · 高中物理组</div>
          <div className="win-text-disabled" style={{ fontSize: '11px' }}>累计 {scripts.length} 节被分析课程</div>
        </div>
        <div className="win-sunken text-center p-2" style={{ background: '#fff' }}>
          <div style={{ fontSize: '10px', color: '#808080' }}>综合评分</div>
          <div className="win-text-bold" style={{ fontSize: '24px', color: '#000080' }}>{(overall * 100).toFixed(0)}</div>
          <div style={{ fontSize: '10px', color: overall >= 0.85 ? '#008000' : '#808000' }}>
            {overall >= 0.85 ? '优秀' : '良好'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 雷达图 */}
        <div className="win-fieldset">
          <legend>多维能力评估</legend>
          <RadarChart data={radarData} color="#000080" height={240} />
        </div>

        {/* 趋势曲线 */}
        <div className="win-fieldset">
          <legend>近 {scripts.length} 节课趋势</legend>
          <TrendChart data={trend} color="#008000" height={240} />
        </div>
      </div>

      {/* 优势/短板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="win-fieldset">
          <legend>✅ 优势维度</legend>
          <ul className="list-disc pl-5" style={{ fontSize: '11px', lineHeight: '1.6' }}>
            {strengths.map((s) => (
              <li key={s.axis}>
                <span className="win-text-bold">{s.axis}</span>：{(s.value * 100).toFixed(0)}% — {s.value >= 0.88 ? '稳定优秀，可作为示范标杆' : '保持良好水平'}
              </li>
            ))}
          </ul>
        </div>
        <div className="win-fieldset">
          <legend>⚠ 短板维度</legend>
          <ul className="list-disc pl-5" style={{ fontSize: '11px', lineHeight: '1.6' }}>
            {weaknesses.map((s) => (
              <li key={s.axis}>
                <span className="win-text-bold">{s.axis}</span>：{(s.value * 100).toFixed(0)}% — 建议参加相关教研活动或线上培训
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Session 历史 */}
      <div className="win-fieldset">
        <legend>会话历史 ({scripts.length})</legend>
        <div className="win-sunken bg-white overflow-auto" style={{ maxHeight: '200px' }}>
          <table className="w-full" style={{ fontSize: '11px' }}>
            <thead className="bg-[#c0c0c0]">
              <tr>
                <th className="text-left px-2 py-1">日期</th>
                <th className="text-left px-2 py-1">课程</th>
                <th className="text-center px-2 py-1">时长</th>
                <th className="text-center px-2 py-1">学生</th>
                <th className="text-center px-2 py-1">综合分</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((s) => {
                const m = s.script.metrics;
                const avg = (m.teaching + m.engagement + m.interaction + m.compliance + m.innovation) / 5;
                return (
                  <tr key={s.id} className="border-t border-[#c0c0c0]">
                    <td className="px-2 py-1">{s.date}</td>
                    <td className="px-2 py-1">{s.icon} {s.label}</td>
                    <td className="text-center px-2 py-1">{Math.floor(s.script.duration / 60)}分{s.script.duration % 60}秒</td>
                    <td className="text-center px-2 py-1">{s.script.students.length}</td>
                    <td className="text-center px-2 py-1 win-text-bold" style={{ color: avg >= 0.85 ? '#008000' : '#808000' }}>
                      {(avg * 100).toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentProfile({ scripts }: { scripts: { id: ScenarioType; label: string; icon: string; date: string; script: ReturnType<typeof getScript> }[] }) {
  // 学生视角默认聚焦每个场景的 students[0]（张明/学生 A 等）
  const studentData = scripts.map((s) => {
    const me = s.script.students[0];
    const avg = me.timeline.reduce((a, p) => a + p.attention, 0) / me.timeline.length;
    return { ...s, me, avg };
  });

  const radarData: RadarDatum[] = useMemo(() => {
    // 5 维度估算：注意度/知识点掌握/互动性/规范性/学习稳定
    const attentionAvg = studentData.reduce((a, s) => a + s.avg, 0) / studentData.length;
    const masteryAvg = studentData.reduce((a, s) => a + (s.script.wiki.nodes.length * 0.6) / s.script.wiki.nodes.length, 0) / studentData.length;
    const interactionAvg = studentData.reduce((a, s) => {
      const interactive = s.me.timeline.filter((p) => p.state === '提问' || p.state === '讨论').length;
      return a + Math.min(1, interactive / 3);
    }, 0) / studentData.length;
    return [
      { axis: '注意度', value: attentionAvg },
      { axis: '知识掌握', value: masteryAvg },
      { axis: '互动性', value: interactionAvg },
      { axis: '学习规范', value: 0.82 },
      { axis: '学习稳定', value: 0.78 },
    ];
  }, [studentData]);

  const trend: TrendDatum[] = studentData.map((s) => ({ label: s.date, score: s.avg }));
  const overall = radarData.reduce((a, d) => a + d.value, 0) / radarData.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="win-raised p-3 flex items-center gap-3">
        <div className="flex items-center justify-center text-white" style={{ width: '48px', height: '48px', background: '#008000', fontSize: '24px', fontWeight: 'bold' }}>
          张
        </div>
        <div className="flex-1">
          <h1 className="win-text-bold" style={{ fontSize: '18px' }}>张明</h1>
          <div className="win-text" style={{ fontSize: '12px' }}>高二·三班 · 学号 2023099 · 选科物化生</div>
          <div className="win-text-disabled" style={{ fontSize: '11px' }}>累计 {scripts.length} 节被分析课程</div>
        </div>
        <div className="win-sunken text-center p-2" style={{ background: '#fff' }}>
          <div style={{ fontSize: '10px', color: '#808080' }}>学情综合分</div>
          <div className="win-text-bold" style={{ fontSize: '24px', color: '#008000' }}>{(overall * 100).toFixed(0)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="win-fieldset">
          <legend>学情多维评估</legend>
          <RadarChart data={radarData} color="#008000" height={240} />
        </div>
        <div className="win-fieldset">
          <legend>近 {scripts.length} 节课趋势</legend>
          <TrendChart data={trend} color="#008000" height={240} />
        </div>
      </div>

      <div className="win-fieldset">
        <legend>知识盲区分析</legend>
        <div className="win-sunken bg-white p-2" style={{ fontSize: '11px' }}>
          {scripts.map((s) => (
            <div key={s.id} className="mb-2 pb-2 border-b border-[#e0e0e0]">
              <div className="win-text-bold">{s.icon} {s.label}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {s.script.wiki.nodes.map((n) => {
                  const mastery = ((n.title.length * 7) % 41) / 40;
                  return (
                    <span
                      key={n.id}
                      className="px-2 py-[2px]"
                      style={{
                        background: mastery >= 0.6 ? '#c0ffc0' : mastery >= 0.3 ? '#ffffc0' : '#ffc0c0',
                        border: `1px solid ${mastery >= 0.6 ? '#008000' : mastery >= 0.3 ? '#808000' : '#ff0000'}`,
                        fontSize: '10px',
                      }}
                      title={n.summary}
                    >
                      {n.title} ({(mastery * 100).toFixed(0)}%)
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="win-fieldset">
        <legend>课程会话历史</legend>
        <div className="win-sunken bg-white overflow-auto" style={{ maxHeight: '200px' }}>
          <table className="w-full" style={{ fontSize: '11px' }}>
            <thead className="bg-[#c0c0c0]">
              <tr>
                <th className="text-left px-2 py-1">日期</th>
                <th className="text-left px-2 py-1">课程</th>
                <th className="text-center px-2 py-1">我的注意度</th>
                <th className="text-center px-2 py-1">状态</th>
                <th className="text-center px-2 py-1">互动</th>
              </tr>
            </thead>
            <tbody>
              {studentData.map((s) => (
                <tr key={s.id} className="border-t border-[#c0c0c0]">
                  <td className="px-2 py-1">{s.date}</td>
                  <td className="px-2 py-1">{s.icon} {s.label}</td>
                  <td className="text-center px-2 py-1 win-text-bold" style={{ color: s.avg >= 0.8 ? '#008000' : '#808000' }}>
                    {(s.avg * 100).toFixed(0)}%
                  </td>
                  <td className="text-center px-2 py-1">{s.me.timeline[0]?.state}</td>
                  <td className="text-center px-2 py-1">
                    {s.me.timeline.filter((p) => p.state === '提问' || p.state === '讨论').length} 次
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
