import { useEffect, useState } from 'react';
import { getCapabilityProvider } from '../harness/providerRegistry';
import type { GameModule, ScenarioType } from '../harness/types';
import { useGameStore } from '../stores/gameStore';
import TimedQA from './games/TimedQA';
import MatchGame from './games/MatchGame';
import ConnectionGame from './games/ConnectionGame';

const SCENARIO_OPTIONS: { id: ScenarioType; label: string; icon: string }[] = [
  { id: 'classroom', label: '高一物理·牛顿第二定律', icon: '🏫' },
  { id: 'pe', label: '高二体育·篮球运球', icon: '⚽' },
  { id: 'lab', label: '高二化学·酸碱中和滴定', icon: '🔬' },
  { id: 'workshop', label: '实训车间·普通车削', icon: '🏭' },
  { id: 'microlesson', label: '高三数学·函数单调性', icon: '🎥' },
];

/** 学生互动游戏 App：经 CapabilityProvider 加载游戏模块，按类型分发，得分持久化 */
export default function LearningGameApp() {
  const [scenario, setScenario] = useState<ScenarioType>('classroom');
  const [modules, setModules] = useState<GameModule[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const best = useGameStore((s) => s.best);
  const recordBest = useGameStore((s) => s.recordBest);

  useEffect(() => {
    let cancelled = false;
    setModules([]);
    setActiveId(null);
    setResult(null);
    getCapabilityProvider()
      .getGames(scenario)
      .then((m) => { if (!cancelled) { setModules(m); setActiveId(m[0]?.id ?? null); } })
      .catch((e) => console.error('LearningGame load', e));
    return () => { cancelled = true; };
  }, [scenario]);

  const active = modules.find((m) => m.id === activeId) ?? null;

  const handleDone = (score: number, total: number) => {
    setResult({ score, total });
    if (active) recordBest(active.id, score);
  };

  const renderGame = (m: GameModule) => {
    const props = { questions: m.questions, onDone: handleDone };
    switch (m.type) {
      case 'choice': return <TimedQA key={m.id} {...props} />;
      case 'match': return <MatchGame key={m.id} {...props} />;
      case 'connect': return <ConnectionGame key={m.id} {...props} />;
      default: return <div className="p-3">未知游戏类型</div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-win-gray">
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">🎮 学生闯关 · 课堂内容互动</span>
        <span className="text-gray-600">|</span>
        <span>场景:</span>
        <select className="win-input" value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioType)} style={{ fontSize: '11px', padding: '1px 4px' }}>
          {SCENARIO_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.icon} {o.label}</option>)}
        </select>
        <div className="flex-1" />
        <span className="win-text-disabled">共 {modules.length} 个游戏</span>
      </div>

      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        {/* 左：游戏列表 */}
        <div style={{ width: '200px' }} className="min-h-0">
          <div className="win-sunken bg-white p-1 h-full overflow-auto" style={{ fontSize: '11px' }}>
            <div className="px-1 py-1 win-text-bold" style={{ color: '#000080' }}>🎯 游戏列表</div>
            {modules.map((m) => (
              <button key={m.id} className="w-full text-left flex items-center gap-1 pl-2 pr-1 py-[3px]" style={{ fontSize: '11px', background: activeId === m.id ? '#000080' : 'transparent', color: activeId === m.id ? '#fff' : '#000' }} onClick={() => { setActiveId(m.id); setResult(null); }}>
                <span>{m.type === 'choice' ? '⏱' : m.type === 'match' ? '☑' : '🔗'}</span>
                <span className="truncate flex-1">{m.title}</span>
                <span style={{ fontSize: '9px', opacity: 0.7 }}>·{best[m.id] ?? 0}</span>
              </button>
            ))}
            {modules.length === 0 && <div className="p-2 text-gray-500 italic">本场景暂无游戏</div>}
          </div>
        </div>

        {/* 右：游戏区 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {active && result == null && renderGame(active)}
          {active && result != null && (
            <div className="win-sunken bg-white p-4 h-full flex flex-col items-center justify-center" style={{ fontSize: '13px' }}>
              <div className="win-text-bold" style={{ color: '#000080', fontSize: '16px' }}>🎉 完成！</div>
              <div className="mt-2">得分 <span className="win-text-bold">{result.score}</span> / {result.total}</div>
              <div className="mt-1" style={{ fontSize: '11px', color: '#808000' }}>最佳：{best[active.id] ?? result.score}</div>
              <button className="win-button is-default mt-3" onClick={() => setResult(null)} style={{ padding: '3px 14px' }}>再玩一次</button>
            </div>
          )}
          {!active && (
            <div className="win-sunken bg-white p-3 h-full flex items-center justify-center text-gray-500 italic" style={{ fontSize: '12px' }}>▌ 请从左侧选择一个游戏</div>
          )}
        </div>
      </div>
    </div>
  );
}
