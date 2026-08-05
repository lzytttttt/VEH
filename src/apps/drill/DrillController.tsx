import { useEffect, useState } from 'react';
import { getCapabilityProvider } from '../../harness/providerRegistry';
import type { ScenarioType, SimulationScript } from '../../harness/types';

interface Props {
  scenario: ScenarioType;
  onActiveStudent: (id: string | null) => void;
  onScore: (cur: number, max: number) => void;
}

/**
 * 演练控制器 — 经 CapabilityProvider 加载剧本，按情境推进教师应对选择
 * - 每个情境给出选项，选择后展示脚本反馈 + 得分
 * - 涉及学生（按姓名匹配情境）回传高亮 id 给 3D 场景
 */
export default function DrillController({ scenario, onActiveStudent, onScore }: Props) {
  const [sim, setSim] = useState<SimulationScript | null>(null);
  const [branchIdx, setBranchIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSim(null);
    setBranchIdx(0);
    setChosen(null);
    setScore(0);
    getCapabilityProvider()
      .getSimulation(scenario)
      .then((s) => { if (!cancelled) setSim(s); })
      .catch((e) => console.error('DrillController load sim', e));
    return () => { cancelled = true; };
  }, [scenario]);

  const branch = sim?.branches[branchIdx] ?? null;
  const maxScore = sim ? sim.branches.reduce((m, b) => m + Math.max(...b.options.map((o) => o.score)), 0) : 0;
  const involved = branch && sim ? sim.students.find((s) => branch.situation.includes(s.name)) ?? null : null;

  useEffect(() => {
    onActiveStudent(branch ? involved?.id ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchIdx, branch]);

  useEffect(() => {
    onScore(score, maxScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, maxScore]);

  if (!sim) {
    return (
      <div className="win-sunken bg-white p-3 h-full flex items-center justify-center" style={{ fontSize: '12px' }}>
        <span className="win-text-disabled animate-blink">▌ 加载演练剧本...</span>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px' }}>
        <div className="win-text-bold" style={{ color: '#000080', fontSize: '14px' }}>🎉 演练完成</div>
        <div className="mt-2">累计得分：<span className="win-text-bold">{score}</span> / {maxScore}</div>
        <div className="mt-1 text-gray-600">建议复盘各情境反馈，关注低分应对策略，下次可尝试更优选项。</div>
        <button className="win-button mt-3 is-default" onClick={() => { setBranchIdx(0); setChosen(null); setScore(0); }} style={{ padding: '2px 12px' }}>
          重新演练
        </button>
      </div>
    );
  }

  const chosenOption = chosen ? branch.options.find((o) => o.id === chosen) ?? null : null;

  const handleChoose = (optId: string) => {
    if (chosen) return;
    const opt = branch.options.find((o) => o.id === optId);
    if (!opt) return;
    setChosen(optId);
    setScore((s) => s + opt.score);
  };

  return (
    <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px' }}>
      <div className="flex items-center justify-between">
        <span className="win-text-bold" style={{ color: '#000080' }}>情境 {branchIdx + 1}/{sim.branches.length}</span>
        <span className="win-text-disabled">得分 {score}/{maxScore}</span>
      </div>

      <div className="win-fieldset mt-2">
        <legend>情境</legend>
        <div style={{ lineHeight: 1.6 }}>{branch.situation}</div>
        {involved && (
          <div className="mt-1" style={{ fontSize: '11px', color: '#008000' }}>
            涉及学生：{involved.name}（{involved.prompt}）
          </div>
        )}
      </div>

      <div className="win-fieldset mt-2">
        <legend>你的应对</legend>
        <div className="flex flex-col gap-1">
          {branch.options.map((o) => {
            const showResult = chosen != null;
            return (
              <button
                key={o.id}
                className="win-button text-left"
                style={{ fontSize: '12px', padding: '4px 8px' }}
                onClick={() => handleChoose(o.id)}
                disabled={chosen != null}
              >
                {showResult && (o.score >= 8 ? '✅ ' : o.score >= 4 ? '➖ ' : '❌ ')}
                {o.label}
                {showResult && <span className="text-gray-600" style={{ fontSize: '11px' }}> （+{o.score}）</span>}
              </button>
            );
          })}
        </div>
      </div>

      {chosenOption && (
        <div className="win-fieldset mt-2">
          <legend>反馈</legend>
          <div style={{ lineHeight: 1.6 }}>{chosenOption.feedback}</div>
          <button className="win-button mt-2 is-default" onClick={() => { setChosen(null); setBranchIdx((i) => i + 1); }} style={{ padding: '2px 12px' }}>
            {branchIdx + 1 < sim.branches.length ? '下一情境 →' : '完成演练 ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
