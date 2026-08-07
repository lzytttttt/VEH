import type { EvalResult, EvalTarget, Evaluator } from './types';
import { ruleCheck } from './ruleChecks';

/**
 * Mock 评估器 — 纯规则检查，离线零依赖
 *
 * 不调 LLM（即使生成 Provider 为 api 模式）。用于：
 * - 离线演示（CI 回归）
 * - 显式只信任确定性规则的场景
 */
export class MockEvaluator implements Evaluator {
  readonly name = 'MockEvaluator (rule-only)';

  async evaluate(
    target: EvalTarget,
    content: unknown,
    ctx?: Record<string, unknown>,
  ): Promise<EvalResult> {
    const rule = ruleCheck(target, content, ctx);
    return {
      target,
      score: rule.score,
      passed: rule.score >= 7,
      dimensions: rule.dimensions,
      issues: rule.issues,
      method: 'rule',
      timestamp: Date.now(),
    };
  }
}
