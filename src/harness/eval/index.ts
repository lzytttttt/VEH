/**
 * Eval Harness 自包含注册中心
 *
 * 不放入中央 providerRegistry。LLM 打分复用对应生成 Provider 的 config（见 llmScorer），
 * 故 eval 无独立配置项。getEvaluator() 返回 EvaluatorImpl（规则+LLM 双通道，LLM 自动按
 * 对应 Provider active 决定是否启用）。
 */
import { EvaluatorImpl } from './Evaluator';
import { MockEvaluator } from './MockEvaluator';
import type { Evaluator, EvalResult, EvalTarget } from './types';
import { useEvalStore } from './evalStore';

let cached: Evaluator | null = null;

/** 获取评估器（默认双通道；forceMock=true 时强制纯规则） */
export function getEvaluator(forceMock = false): Evaluator {
  if (forceMock) return new MockEvaluator();
  if (!cached) cached = new EvaluatorImpl();
  return cached;
}

/** 便捷：评估并记录到趋势 store */
export async function evaluateAndRecord(
  target: EvalTarget,
  content: unknown,
  ctx?: Record<string, unknown>,
): Promise<EvalResult> {
  const evaluator = getEvaluator();
  const result = await evaluator.evaluate(target, content, ctx);
  useEvalStore.getState().addResult(result);
  return result;
}

export type { Evaluator, EvalResult, EvalTarget } from './types';
export { useEvalStore } from './evalStore';
