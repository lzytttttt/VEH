import type { SlidesGenProvider } from './types';
import { MockSlidesProvider } from './MockProvider';
import { SlidesAdapter } from './adapter';
import { useApiConfigStore } from '../../stores/apiConfigStore';

/**
 * 课件 Harness 注册中心 — 自包含，不依赖中央 providerRegistry（指南 §7.2 物理隔离）
 *
 * 解耦设计：课件工具自管 provider 注册/切换/缓存，
 * 与教案 harness（../lessonPlan/）完全物理隔离，active 独立于其他 Provider。
 * active 来自 apiConfigStore 的 'slides' 条目；config 字段由 Adapter 调用时懒读取。
 */

const REGISTRY: Record<string, () => SlidesGenProvider> = {
  mock: () => new MockSlidesProvider(),
  api: () => new SlidesAdapter(),
};

let cached: SlidesGenProvider | null = null;
let lastCachedName: string | null = null;

export function getSlidesGenProvider(name?: string): SlidesGenProvider {
  const active = name ?? useApiConfigStore.getState().configs.slides.active;
  if (cached && lastCachedName === active) return cached;
  const factory = REGISTRY[active] ?? REGISTRY.mock;
  const provider = factory();
  cached = provider;
  lastCachedName = active;
  return provider;
}

export function listSlidesGenProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Slides (课件模板)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: true },
  ];
}

export type { SlidesGenProvider, SlidesGenChunk, SlidesDraftInput, SlidesChatInput, SlideDesign, SlideDesignMeta } from './types';
