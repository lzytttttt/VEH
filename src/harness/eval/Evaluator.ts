import type { EvalResult, EvalTarget, Evaluator } from './types';
import { ruleCheck } from './ruleChecks';
import { canLLMScore, llmScore } from './llmScorer';

/**
 * 评估器（真实实现）— 规则检查优先 + LLM 打分补充
 *
 * 流程：
 * 1. 始终跑规则检查（确定性、离线可用）
 * 2. 若对应生成 Provider 为 api 模式，追加 LLM 打分维度
 * 3. 综合分 = 规则分与 LLM 分的加权（规则 0.6 + LLM 0.4，规则优先）
 */
export class EvaluatorImpl implements Evaluator {
  readonly name = 'Evaluator';

  async evaluate(
    target: EvalTarget,
    content: unknown,
    ctx?: Record<string, unknown>,
  ): Promise<EvalResult> {
    const rule = ruleCheck(target, content, ctx);
    let score = rule.score;
    let method: EvalResult['method'] = 'rule';
    const dimensions = [...rule.dimensions];

    if (canLLMScore(target)) {
      const llm = await llmScore(target, content);
      if (llm) {
        dimensions.push(llm);
        score = Math.round(rule.score * 0.6 + llm.score * 0.4);
        method = 'both';
      }
    }

    const clamped = Math.max(1, Math.min(10, score));
    return {
      target,
      score: clamped,
      passed: clamped >= 7,
      dimensions,
      issues: rule.issues,
      method,
      timestamp: Date.now(),
    };
  }
}
