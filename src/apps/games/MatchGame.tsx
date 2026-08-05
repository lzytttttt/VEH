import { useState } from 'react';
import type { GameQuestion } from '../../harness/types';

interface Props {
  questions: GameQuestion[];
  onDone: (score: number, total: number) => void;
}

/** 概念多选：选中所有正确项，全对才得分 */
export default function MatchGame({ questions, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const q = questions[idx];
  const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
  const isExact = answers.every((a) => selected.has(a)) && [...selected].every((s) => answers.includes(s));

  const toggle = (o: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(o)) n.delete(o); else n.add(o);
      return n;
    });
  };

  const submit = () => {
    if (submitted) return;
    setSubmitted(true);
    if (isExact) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setSelected(new Set());
      setSubmitted(false);
    } else onDone(score, questions.length);
  };

  return (
    <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="win-text-bold" style={{ color: '#000080' }}>☑ 第 {idx + 1}/{questions.length} 题（多选）</span>
        <span>得分 {score}</span>
      </div>
      <div className="win-fieldset">
        <legend>题目</legend>
        <div style={{ lineHeight: 1.6, fontSize: '13px' }}>{q.prompt}</div>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        {q.options.map((o) => {
          const isAns = answers.includes(o);
          const isSel = selected.has(o);
          let bg = '#fff', color = '#000';
          if (submitted && isAns && isSel) { bg = '#008000'; color = '#fff'; }
          else if (submitted && isAns && !isSel) { bg = '#ffff80'; }
          else if (submitted && !isAns && isSel) { bg = '#ff8080'; }
          else if (isSel) { bg = '#000080'; color = '#fff'; }
          return (
            <button key={o} className="win-button text-left" style={{ fontSize: '12px', padding: '5px 8px', background: bg, color }} onClick={() => toggle(o)} disabled={submitted}>
              {submitted ? (isAns ? '✓ ' : isSel ? '✗ ' : '  ') : (isSel ? '■ ' : '□ ')}{o}
            </button>
          );
        })}
      </div>
      {!submitted ? (
        <button className="win-button mt-2 is-default" onClick={submit} style={{ padding: '2px 12px' }}>提交</button>
      ) : (
        <div className="win-fieldset mt-2">
          <legend>{isExact ? '✅ 全对' : '⚠ 部分正确或错误'}</legend>
          {q.explain && <div style={{ lineHeight: 1.6 }}>{q.explain}</div>}
          <button className="win-button mt-2 is-default" onClick={next} style={{ padding: '2px 12px' }}>
            {idx + 1 < questions.length ? '下一题 →' : '查看结果 ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
