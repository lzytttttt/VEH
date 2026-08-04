import { useState } from 'react';
import type { StudentObservation } from '../../harness/types';
import StudentTimeline from '../../components/StudentTimeline';

interface Props {
  students: StudentObservation[];
  currentTime: number;
  onSeek: (t: number) => void;
}

/**
 * 教师视角：学生个体观察面板
 * - 学生列表（左侧）
 * - 选中学生个体时间线（右侧）
 */
export default function StudentPanel({ students, currentTime, onSeek }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null);
  const selected = students.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-full gap-2 p-2">
      {/* 学生列表 */}
      <div className="win-fieldset flex flex-col" style={{ width: '180px' }}>
        <legend>学生列表 ({students.length})</legend>
        <div className="win-sunken flex-1 overflow-auto bg-white">
          {students.map((s) => {
            const current = [...s.timeline].reverse().find((p) => p.t <= currentTime) ?? s.timeline[0];
            const isLow = current && current.attention < 0.6;
            return (
              <button
                key={s.id}
                className={`w-full text-left flex items-center gap-2 px-2 py-1 ${selectedId === s.id ? 'is-pressed' : ''}`}
                style={{
                  fontSize: '11px',
                  background: selectedId === s.id ? '#000080' : 'transparent',
                  color: selectedId === s.id ? '#fff' : '#000',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedId(s.id)}
              >
                <div
                  className="flex items-center justify-center text-white"
                  style={{ width: '18px', height: '18px', background: s.avatarColor, fontSize: '10px', fontWeight: 'bold' }}
                >
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 truncate">{s.name}</div>
                {isLow && (
                  <span title="注意度低" style={{ color: '#ff0000' }}>⚠</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 个体详情 */}
      <div className="flex-1 overflow-auto">
        <StudentTimeline student={selected} currentTime={currentTime} />
        {selected && (
          <div className="mt-2 flex gap-2">
            <button
              className="win-button"
              onClick={() => onSeek(selected.timeline[0].t)}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              跳转到该学生入课
            </button>
            <button
              className="win-button"
              onClick={() => {
                const low = [...selected.timeline].reverse().find((p) => p.attention < 0.6);
                if (low) onSeek(low.t);
              }}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              跳转到首次走神点
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
