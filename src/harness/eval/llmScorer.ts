import type { EvalDimension, EvalTarget } from './types';
import { chatCompletionJSON } from '../adapters/sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';
import type { ProviderKey } from '../../stores/apiConfigStore';

/** 各评估对象复用的生成 Provider 配置 key */
const TARGET_CONFIG: Record<EvalTarget, ProviderKey> = {
  lessonPlan: 'lessonPlan',
  slides: 'slides',
  wiki: 'capability',
  game: 'capability',
  governance: 'governance',
};

/** 对应生成 Provider 是否为 api 模式（决定能否走 LLM 打分） */
export function canLLMScore(target: EvalTarget): boolean {
  return getProviderConfig(TARGET_CONFIG[target]).active === 'api';
}

/**
 * LLM 打分：让模型对内容按维度打 1-10 分 + 理由。
 * 失败返回 null（调用方仅用规则结果）。
 */
export async function llmScore(
  target: EvalTarget,
  content: unknown,
): Promise<EvalDimension | null> {
  const key = TARGET_CONFIG[target];
  const cfg = getProviderConfig(key);
  if (cfg.active !== 'api') return null;

  const contentStr = typeof content === 'string' ? content : JSON.stringify(content).slice(0, 1500);
  const targetLabel: Record<EvalTarget, string> = {
    lessonPlan: '教案',
    slides: '课件',
    wiki: '知识 WIKI',
    game: '互动题目',
    governance: '治理简报',
  };

  try {
    const result = await chatCompletionJSON<{ score: number; reason: string }>({
      baseURL: cfg.baseURL || '/api/llm',
      apiKey: cfg.apiKey,
      model: cfg.model || 'deepseek-v4-flash',
      messages: [
        {
          role: 'system',
          content: `你是教学质量评估专家。对以下${targetLabel[target]}内容打分（1-10 整数）。
评估维度：结构完整性、内容准确性、实用性。返回 JSON：{"score": number, "reason": "string 简要说明扣分点"}
7 分及以上为合格。只返回 JSON。`,
        },
        { role: 'user', content: contentStr.slice(0, 1500) },
      ],
    });
    if (result && typeof result.score === 'number' && typeof result.reason === 'string') {
      return {
        name: 'LLM 综合评估',
        score: Math.max(1, Math.min(10, result.score)),
        reason: result.reason,
      };
    }
    return null;
  } catch (e) {
    console.warn('llmScore failed', e);
    return null;
  }
}
