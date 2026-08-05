import { Suspense, lazy, useEffect, useState } from 'react';
import { getCapabilityProvider } from '../harness/providerRegistry';
import type { ScenarioType, VirtualStudentState } from '../harness/types';
import DrillController from './drill/DrillController';

// Three.js 场景懒加载，避免 ~600KB three 污染首屏
const Classroom3DScene = lazy(() => import('./drill/Classroom3DScene'));

const SCENARIO_OPTIONS: { id: ScenarioType; label: string; icon: string }[] = [
  { id: 'classroom', label: '高一物理·牛顿第二定律', icon: '🏫' },
  { id: 'pe', label: '高二体育·篮球运球', icon: '⚽' },
  { id: 'lab', label: '高二化学·酸碱中和滴定', icon: '🔬' },
  { id: 'workshop', label: '实训车间·普通车削', icon: '🏭' },
  { id: 'microlesson', label: '高三数学·函数单调性', icon: '🎥' },
];

export default function TeacherDrillApp() {
  const [scenario, setScenario] = useState<ScenarioType>('classroom');
  const [students, setStudents] = useState<VirtualStudentState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [score, setScore] = useState({ cur: 0, max: 0 });

  useEffect(() => {
    let cancelled = false;
    setActiveId(null);
    setScore({ cur: 0, max: 0 });
    getCapabilityProvider()
      .getSimulation(scenario)
      .then((s) => { if (!cancelled) setStudents(s.students); })
      .catch((e) => console.error('TeacherDrill load students', e));
    return () => { cancelled = true; };
  }, [scenario]);

  return (
    <div className="flex flex-col h-full bg-win-gray">
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">🎓 教师演练 · 虚拟学生模拟</span>
        <span className="text-gray-600">|</span>
        <span>场景:</span>
        <select
          className="win-input"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioType)}
          style={{ fontSize: '11px', padding: '1px 4px' }}
        >
          {SCENARIO_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.icon} {o.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="win-text-disabled">得分 {score.cur}/{score.max || '—'} · 可拖拽旋转 3D 视角</span>
      </div>

      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        <div className="flex-1 min-h-0 win-sunken" style={{ background: '#0a0a2a', overflow: 'hidden' }}>
          <Suspense fallback={<div className="flex items-center justify-center h-full" style={{ color: '#c0c0c0', fontSize: '12px' }}>▌ 加载 3D 教室...</div>}>
            <Classroom3DScene students={students} highlightId={activeId} />
          </Suspense>
        </div>
        <div style={{ width: '320px' }} className="min-h-0">
          <DrillController
            key={scenario}
            scenario={scenario}
            onActiveStudent={setActiveId}
            onScore={(cur, max) => setScore({ cur, max })}
          />
        </div>
      </div>
    </div>
  );
}
