import { useEffect, useMemo, useState } from 'react';
import type { GameQuestion } from '../../harness/types';

interface Props {
  questions: GameQuestion[];
  onDone: (score: number, total: number) => void;
}

/** 概念连线：点左侧项再点右侧项配对，全部正确得分 */
export default function ConnectionGame({ questions, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const q = questions[idx];
  const pairs = q.pairs ?? [];
  const rights = useMemo(() => [...pairs].map((p) => p.right).sort(() => Math.random() - 0.5), [idx, pairs.length]);

  useEffect(() => {
    setAssign({});
    setSelLeft(null);
    setSubmitted(false);
  }, [idx]);

  const clickLeft = (left: string) => {
    if (submitted) return;
    setSelLeft(left);
  };

  const clickRight = (right: string) => {
    if (submitted || !selLeft) return;
    setAssign((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === right) delete next[k];
      next[selLeft] = right;
      return next;
    });
    setSelLeft(null);
  };

  const allAssigned = pairs.every((p) => assign[p.left] != null);
  const correctCount = pairs.filter((p) => assign[p.left] === p.right).length;

  const submit = () => {
    setSubmitted(true);
    if (correctCount === pairs.length) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else onDone(score, questions.length);
  };

  return (
    <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="win-text-bold" style={{ color: '#000080' }}>🔗 第 {idx + 1}/{questions.length} 题（连线）</span>
        <span>得分 {score}</span>
      </div>
      <div className="win-fieldset mb-2">
        <legend>题目</legend>
        <div style={{ lineHeight: 1.6, fontSize: '13px' }}>{q.prompt}</div>
      </div>
      <div className="flex gap-3">
        {/* 左列 */}
        <div className="flex flex-col gap-1" style={{ flex: 1 }}>
          {pairs.map((p) => {
            const assigned = assign[p.left];
            const isSel = selLeft === p.left;
            const isCorrect = submitted && assigned === p.right;
            const isWrong = submitted && assigned != null && assigned !== p.right;
            let bg = '#fff', color = '#000';
            if (isSel) { bg = '#000080'; color = '#fff'; }
            else if (isCorrect) { bg = '#008000'; color = '#fff'; }
            else if (isWrong) { bg = '#ff8080'; }
            return (
              <button key={p.left} className="win-button" style={{ fontSize: '11px', padding: '5px 6px', background: bg, color }} onClick={() => clickLeft(p.left)} disabled={submitted}>
                {p.left}
                {assigned && <div style={{ fontSize: '9px', marginTop: '2px' }}>→ {assigned}</div>}
              </button>
            );
          })}
        </div>
        {/* 右列 */}
        <div className="flex flex-col gap-1" style={{ flex: 1 }}>
          {rights.map((r) => {
            const used = Object.values(assign).includes(r);
            return (
              <button key={r} className="win-button" style={{ fontSize: '11px', padding: '5px 6px', background: used ? '#c0c0c0' : '#fff', opacity: used && !selLeft ? 0.6 : 1 }} onClick={() => clickRight(r)} disabled={submitted || selLeft == null}>
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2" style={{ fontSize: '11px', color: '#808000' }}>
        {selLeft ? `已选左侧「${selLeft}」，请点击右侧配对项` : '点击左侧项，再点击右侧项进行连线'}
      </div>
      {!submitted ? (
        <button className="win-button mt-2 is-default" onClick={submit} disabled={!allAssigned} style={{ padding: '2px 12px' }}>
          {allAssigned ? '提交' : '请完成全部连线'}
        </button>
      ) : (
        <div className="win-fieldset mt-2">
          <legend>正确 {correctCount}/{pairs.length} 对</legend>
          {q.explain && <div style={{ lineHeight: 1.6 }}>{q.explain}</div>}
          <button className="win-button mt-2 is-default" onClick={next} style={{ padding: '2px 12px' }}>
            {idx + 1 < questions.length ? '下一题 →' : '查看结果 ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
