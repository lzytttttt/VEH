import { useEffect, useRef, useState } from 'react';
import type { GameQuestion } from '../../harness/types';

interface Props {
  questions: GameQuestion[];
  onDone: (score: number, total: number) => void;
}

const PER_Q = 15; // 每题限时秒数

/** 限时问答（单选）：每题倒计时，超时判错 */
export default function TimedQA({ questions, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [time, setTime] = useState(PER_Q);
  const timerRef = useRef<number | null>(null);
  const q = questions[idx];
  const answer = Array.isArray(q.answer) ? q.answer[0] : q.answer;

  useEffect(() => {
    setTime(PER_Q);
    setChosen(null);
    timerRef.current = window.setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [idx]);

  useEffect(() => {
    if (time === 0 && chosen == null) {
      if (timerRef.current) clearInterval(timerRef.current);
      setChosen('__timeout__');
    }
  }, [time, chosen]);

  const choose = (opt: string) => {
    if (chosen) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setChosen(opt);
    if (opt === answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 < questions.length) setIdx(idx + 1);
    else onDone(score, questions.length);
  };

  const pct = (time / PER_Q) * 100;

  return (
    <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="win-text-bold" style={{ color: '#000080' }}>⏱ 第 {idx + 1}/{questions.length} 题</span>
        <span>得分 {score}</span>
      </div>
      {/* 倒计时条 */}
      <div className="win-sunken" style={{ height: '14px', background: '#fff', marginBottom: '8px', position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: time <= 5 ? '#ff0000' : '#008000', transition: 'width 1s linear' }} />
        <span style={{ position: 'absolute', right: '4px', top: 0, fontSize: '10px', lineHeight: '14px' }}>{time}s</span>
      </div>
      <div className="win-fieldset">
        <legend>题目</legend>
        <div style={{ lineHeight: 1.6, fontSize: '13px' }}>{q.prompt}</div>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        {q.options.map((o) => {
          const isAnswer = o === answer;
          const isChosen = chosen === o;
          const show = chosen != null;
          let bg = '#fff', color = '#000';
          if (show && isAnswer) { bg = '#008000'; color = '#fff'; }
          else if (show && isChosen && !isAnswer) { bg = '#ff0000'; color = '#fff'; }
          return (
            <button key={o} className="win-button text-left" style={{ fontSize: '12px', padding: '5px 8px', background: bg, color }} onClick={() => choose(o)} disabled={chosen != null}>
              {o}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="win-fieldset mt-2">
          <legend>{chosen === '__timeout__' ? '⏰ 时间到' : chosen === answer ? '✅ 正确' : '❌ 错误'}</legend>
          {q.explain && <div style={{ lineHeight: 1.6 }}>{q.explain}</div>}
          <button className="win-button mt-2 is-default" onClick={next} style={{ padding: '2px 12px' }}>
            {idx + 1 < questions.length ? '下一题 →' : '查看结果 ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
