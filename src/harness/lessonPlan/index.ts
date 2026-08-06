import type { LessonPlanGenProvider } from './types';
import { MockLessonPlanProvider } from './MockProvider';
import { LessonPlanAdapter } from './adapter';

/**
 * 教案 Harness 注册中心 — 自包含，不依赖中央 providerRegistry
 *
 * 解耦设计：教案工具自管 provider 注册/切换/缓存，
 * 与课件 harness（../slides/）完全物理隔离。
 */

const REGISTRY: Record<string, () => LessonPlanGenProvider> = {
  mock: () => new MockLessonPlanProvider(),
  api: () => new LessonPlanAdapter(),
};

const ACTIVE = 'mock';

let cached: LessonPlanGenProvider | null = null;

export function getLessonPlanGenProvider(name: string = ACTIVE): LessonPlanGenProvider {
  if (name === ACTIVE && cached) return cached;
  const factory = REGISTRY[name] ?? REGISTRY[ACTIVE];
  const provider = factory();
  if (name === ACTIVE) cached = provider;
  return provider;
}

export function listLessonPlanGenProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock LessonPlan (教学模板)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: false },
  ];
}

export type { LessonPlanGenProvider, LessonPlanGenChunk, LessonPlanDraftInput, LessonPlanChatInput } from './types';
