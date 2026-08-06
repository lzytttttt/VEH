import type { LessonPlanGenProvider } from './types';
import { MockLessonPlanProvider } from './MockProvider';
import { LessonPlanAdapter } from './adapter';
import { useApiConfigStore } from '../../stores/apiConfigStore';

/**
 * 教案 Harness 注册中心 — 自包含，不依赖中央 providerRegistry（指南 §7.2 物理隔离）
 *
 * 解耦设计：教案工具自管 provider 注册/切换/缓存，
 * 与课件 harness（../slides/）完全物理隔离，active 独立于其他 Provider。
 * active 来自 apiConfigStore 的 'lessonPlan' 条目；config 字段由 Adapter 调用时懒读取。
 */

const REGISTRY: Record<string, () => LessonPlanGenProvider> = {
  mock: () => new MockLessonPlanProvider(),
  api: () => new LessonPlanAdapter(),
};

let cached: LessonPlanGenProvider | null = null;
let lastCachedName: string | null = null;

export function getLessonPlanGenProvider(name?: string): LessonPlanGenProvider {
  const active = name ?? useApiConfigStore.getState().configs.lessonPlan.active;
  if (cached && lastCachedName === active) return cached;
  const factory = REGISTRY[active] ?? REGISTRY.mock;
  const provider = factory();
  cached = provider;
  lastCachedName = active;
  return provider;
}

export function listLessonPlanGenProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock LessonPlan (教学模板)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: true },
  ];
}

export type { LessonPlanGenProvider, LessonPlanGenChunk, LessonPlanDraftInput, LessonPlanChatInput } from './types';
