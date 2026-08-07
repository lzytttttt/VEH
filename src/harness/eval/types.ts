/**
 * 质量评估核心类型
 *
 * 双通道：规则检查（确定性，离线可用）+ LLM 打分（补充，需对应生成 Provider 为 api 模式）。
 * eval 不需独立 Provider 配置——LLM 打分复用对应生成 Provider（教案→lessonPlan / 课件→slides /
 * Wiki/题目→capability / 治理→governance）的 config，active!=='api' 时跳过 LLM 仅用规则。
 */

export type EvalTarget = 'lessonPlan' | 'slides' | 'wiki' | 'game' | 'governance';

/** 单维度评估结果 */
export interface EvalDimension {
  name: string;
  /** 1-10 分 */
  score: number;
  reason: string;
}

/** 评估总结果 */
export interface EvalResult {
  target: EvalTarget;
  /** 综合分 1-10 */
  score: number;
  /** score >= 7 视为通过 */
  passed: boolean;
  dimensions: EvalDimension[];
  /** 命中的问题清单（规则检查产出） */
  issues: string[];
  /** 评估方法 */
  method: 'rule' | 'llm' | 'both';
  timestamp: number;
}

/** 评估器接口 */
export interface Evaluator {
  readonly name: string;
  evaluate(
    target: EvalTarget,
    content: unknown,
    ctx?: Record<string, unknown>,
  ): Promise<EvalResult>;
}

/** 规则检查产出（内部） */
export interface RuleResult {
  score: number;
  issues: string[];
  dimensions: EvalDimension[];
}
