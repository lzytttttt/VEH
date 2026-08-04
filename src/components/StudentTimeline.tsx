import type { StudentObservation } from '../harness/types';

interface Props {
  student: StudentObservation | null;
  currentTime: number;
}

/**
 * 学生个体时间线 — 显示注意度曲线 + 状态切换点
 */
export default function StudentTimeline({ student, currentTime }: Props) {
  if (!student) {
    return <div className="win-sunken p-3 text-gray-500 italic" style={{ fontSize: '12px' }}>未选择学生</div>;
  }

  const timeline = student.timeline;
  const maxT = timeline.length > 0 ? timeline[timeline.length - 1].t : 1;

  // 当前时刻的状态
  const current = [...timeline].reverse().find((p) => p.t <= currentTime) ?? timeline[0];

  return (
    <div className="win-fieldset h-full flex flex-col">
      <legend>学生观察 · {student.name}</legend>

      {/* 学生信息 */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center justify-center text-white"
          style={{ width: '24px', height: '24px', background: student.avatarColor, fontSize: '12px', fontWeight: 'bold' }}
        >
          {student.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="win-text win-text-bold" style={{ fontSize: '12px' }}>{student.name}</div>
          <div className="win-text-disabled" style={{ fontSize: '11px' }}>ID: {student.id}</div>
        </div>
      </div>

      {/* 当前状态 */}
      <div className="win-sunken p-2 mb-2" style={{ fontSize: '11px' }}>
        <div className="flex items-center justify-between">
          <span>当前状态: <span className="win-text-bold">{current?.state || '—'}</span></span>
          <span>注意度: <span className="win-text-bold">{current ? (current.attention * 100).toFixed(0) + '%' : '—'}</span></span>
        </div>
        {current?.note && <div className="mt-1 text-gray-600">备注: {current.note}</div>}
      </div>

      {/* 注意度曲线 */}
      <div className="win-sunken p-2 mb-2 flex-1" style={{ minHeight: '80px' }}>
        <div className="text-gray-500 mb-1" style={{ fontSize: '10px' }}>注意度变化趋势</div>
        <svg width="100%" height="60" viewBox="0 0 100 50" preserveAspectRatio="none">
          {/* 网格 */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#c0c0c0" strokeWidth="0.2" />
          <line x1="0" y1="25" x2="100" y2="25" stroke="#c0c0c0" strokeWidth="0.2" strokeDasharray="2 2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#c0c0c0" strokeWidth="0.2" />
          {/* 折线 */}
          <polyline
            fill="none"
            stroke="#000080"
            strokeWidth="1"
            points={timeline
              .map((p) => `${(p.t / maxT) * 100},${50 - p.attention * 50}`)
              .join(' ')}
          />
          {/* 点 */}
          {timeline.map((p, i) => (
            <circle
              key={i}
              cx={(p.t / maxT) * 100}
              cy={50 - p.attention * 50}
              r="1"
              fill={p.t <= currentTime ? '#ff0000' : '#808080'}
            />
          ))}
          {/* 当前指示线 */}
          {currentTime > 0 && (
            <line
              x1={(Math.min(currentTime, maxT) / maxT) * 100}
              y1="0"
              x2={(Math.min(currentTime, maxT) / maxT) * 100}
              y2="50"
              stroke="#ff0000"
              strokeWidth="0.3"
              strokeDasharray="1 1"
            />
          )}
        </svg>
      </div>

      {/* AI 反馈 */}
      <div className="win-sunken p-2" style={{ background: '#ffffe0', fontSize: '11px', lineHeight: '1.5' }}>
        <div className="win-text-bold mb-1" style={{ fontSize: '10px', color: '#000080' }}>🤖 AI 个性化反馈</div>
        <div className="text-black">{student.feedback}</div>
      </div>
    </div>
  );
}
