import { useState } from 'react';
import { evaluateAndRecord, useEvalStore } from '../harness/eval';
import type { EvalResult, EvalTarget } from '../harness/eval';
import FeedbackBar from './FeedbackBar';

interface Props {
  target: EvalTarget;
  content: string;
  ctx?: Record<string, unknown>;
}

const TARGET_LABEL: Record<EvalTarget, string> = {
  lessonPlan: '教案',
  slides: '课件',
  wiki: 'Wiki',
  game: '题目',
  governance: '治理简报',
};

/**
 * AI 自评面板 — 自包含组件
 *
 * - 点「评估」调用 Evaluator（规则+LLM 双通道），结果存 evalStore 趋势
 * - 展示综合分 / 通过状态 / 各维度分数 / 问题清单
 * - 内嵌 FeedbackBar 收集用户反馈（写入 agent MemoryStore 偏好）
 * - 底部展示该对象的历史评分趋势（质量改进曲线）
 */
export default function EvalPanel({ target, content, ctx }: Props) {
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const trend = useEvalStore((s) => s.trend(target));

  const handleEval = async () => {
    if (!content || loading) return;
    setLoading(true);
    try {
      const r = await evaluateAndRecord(target, content, ctx);
      setResult(r);
    } catch (e) {
      console.error('EvalPanel eval failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (fb: 'good' | 'bad', reason?: string) => {
    // 反馈写入 agent MemoryStore（影响后续生成偏好）
    try {
      const key = `feedback:${target}`;
      const prev = (window.localStorage.getItem('vlm-edu-hub:agent-memory'));
      const mem = prev ? JSON.parse(prev) : {};
      if (!mem.preferences) mem.preferences = {};
      const list = (mem.preferences[key] as string[]) ?? [];
      list.push(fb === 'bad' && reason ? `差评：${reason}` : '好评');
      mem.preferences[key] = list.slice(-20);
      window.localStorage.setItem('vlm-edu-hub:agent-memory', JSON.stringify(mem));
    } catch (e) {
      console.warn('FeedbackBar persist failed', e);
    }
  };

  return (
    <div className="win-fieldset" style={{ padding: '4px 6px', flexShrink: 0 }}>
      <legend>🔍 AI 自评 · {TARGET_LABEL[target]}</legend>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          className="win-button"
          onClick={handleEval}
          disabled={loading || !content}
          style={{ fontSize: '11px', padding: '2px 10px' }}
        >
          {loading ? '⏳ 评估中...' : '🔍 评估本内容'}
        </button>
        {result && (
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: result.passed ? '#008000' : '#c00' }}>
            {result.score} / 10 {result.passed ? '✓ 合格' : '✗ 待改进'}
            <span style={{ fontSize: '9px', color: '#808080', fontWeight: 'normal', marginLeft: '4px' }}>
              ({result.method === 'both' ? '规则+LLM' : result.method === 'llm' ? 'LLM' : '规则'})
            </span>
          </span>
        )}
        {result && !result.passed && (
          <span style={{ fontSize: '10px', color: '#c00' }}>建议修正后重生成</span>
        )}
      </div>

      {/* 维度分数 */}
      {result && result.dimensions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1" style={{ fontSize: '10px' }}>
          {result.dimensions.map((d, i) => (
            <span key={i} style={{ color: '#000080' }}>
              {d.name}: <b>{d.score}</b>
              <span style={{ color: '#808080', marginLeft: '2px' }} title={d.reason}>· {d.reason.slice(0, 20)}</span>
            </span>
          ))}
        </div>
      )}

      {/* 问题清单 */}
      {result && result.issues.length > 0 && (
        <ul style={{ fontSize: '10px', color: '#c00', marginTop: '2px', paddingLeft: '16px' }}>
          {result.issues.map((iss, i) => (
            <li key={i}>{iss}</li>
          ))}
        </ul>
      )}

      {/* 用户反馈 */}
      {result && <div className="mt-1"><FeedbackBar onFeedback={handleFeedback} /></div>}

      {/* 质量趋势 */}
      {trend.length > 0 && (
        <div className="mt-1 flex items-center gap-1" style={{ fontSize: '9px', color: '#808080' }}>
          <span>📈 趋势:</span>
          {trend.slice(-8).map((t, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: '14px',
                height: `${t.score * 1.4}px`,
                background: t.passed ? '#008000' : '#c00',
              }}
              title={`${t.score} 分`}
            />
          ))}
          <span>（近 {Math.min(trend.length, 8)} 次）</span>
        </div>
      )}
    </div>
  );
}
