import type { SlidesGenProvider } from './types';
import { MockSlidesProvider } from './MockProvider';
import { SlidesAdapter } from './adapter';

/**
 * 课件 Harness 注册中心 — 自包含，不依赖中央 providerRegistry
 *
 * 解耦设计：课件工具自管 provider 注册/切换/缓存，
 * 与教案 harness（../lessonPlan/）完全物理隔离。
 */

const REGISTRY: Record<string, () => SlidesGenProvider> = {
  mock: () => new MockSlidesProvider(),
  api: () => new SlidesAdapter(),
};

const ACTIVE = 'mock';

let cached: SlidesGenProvider | null = null;

export function getSlidesGenProvider(name: string = ACTIVE): SlidesGenProvider {
  if (name === ACTIVE && cached) return cached;
  const factory = REGISTRY[name] ?? REGISTRY[ACTIVE];
  const provider = factory();
  if (name === ACTIVE) cached = provider;
  return provider;
}

export function listSlidesGenProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Slides (课件模板)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: false },
  ];
}

export type { SlidesGenProvider, SlidesGenChunk, SlidesDraftInput, SlidesChatInput, SlideDesign, SlideDesignMeta } from './types';
