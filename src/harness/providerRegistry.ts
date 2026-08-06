import type { VLMProvider, CapabilityProvider, GovernanceProvider, PortalProvider } from './types';
import { MockVLMProvider } from './MockVLMProvider';
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { QwenAdapter } from './adapters/QwenAdapter';
import { VLLMAdapter } from './adapters/VLLMAdapter';
import { MockCapabilityProvider } from './MockCapabilityProvider';
import { CapabilityAdapter } from './adapters/CapabilityAdapter';
import { MockGovernanceProvider } from './MockGovernanceProvider';
import { GovernanceAdapter } from './adapters/GovernanceAdapter';
import { MockPortalProvider } from './MockPortalProvider';
import { PortalAdapter } from './adapters/PortalAdapter';
import { useApiConfigStore } from '../stores/apiConfigStore';

// ============================================================
//  中央注册中心（指南 §7.1）
//  VLM / Capability / Governance / Portal 四个 Provider **各自独立**切换，
//  active 来自 apiConfigStore，互不影响（指南 Q5：可只接治理、其余保持 Mock）。
//  缓存策略：lastCachedName 与当前 active 一致则复用实例，否则重建。
//  config 字段（baseURL/apiKey/model）由各 Adapter 调用时懒读取，改后自然生效。
// ============================================================

// —— ① VLMProvider（课堂分析，多模态） ——

const REGISTRY: Record<string, () => VLMProvider> = {
  mock: () => new MockVLMProvider(),
  openai: () => new OpenAIAdapter(),
  qwen: () => new QwenAdapter(),
  vllm: () => new VLLMAdapter(),
};

let cached: VLMProvider | null = null;
let lastCachedName: string | null = null;

export function getProvider(name?: string): VLMProvider {
  const active = name ?? useApiConfigStore.getState().configs.vlm.active;
  if (cached && lastCachedName === active) return cached;
  const factory = REGISTRY[active] ?? REGISTRY.mock;
  const provider = factory();
  cached = provider;
  lastCachedName = active;
  return provider;
}

export function listProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Provider (预制剧本)', available: true },
    { id: 'openai', name: 'OpenAI 兼容接口', available: true },
    { id: 'qwen', name: '通义千问 Qwen', available: true },
    { id: 'vllm', name: 'VLLM 本地部署', available: true },
  ];
}

// —— ② CapabilityProvider（知识WIKI/演练/游戏取数，可VLM可LLM） ——

const CAPABILITY_REGISTRY: Record<string, () => CapabilityProvider> = {
  mock: () => new MockCapabilityProvider(),
  api: () => new CapabilityAdapter(),
};

let capCached: CapabilityProvider | null = null;
let capLastCachedName: string | null = null;

export function getCapabilityProvider(name?: string): CapabilityProvider {
  const active = name ?? useApiConfigStore.getState().configs.capability.active;
  if (capCached && capLastCachedName === active) return capCached;
  const factory = CAPABILITY_REGISTRY[active] ?? CAPABILITY_REGISTRY.mock;
  const provider = factory();
  capCached = provider;
  capLastCachedName = active;
  return provider;
}

export function listCapabilityProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Capability (脚本派生)', available: true },
    { id: 'api', name: '模型 API Adapter', available: true },
  ];
}

// —— ③ GovernanceProvider（学校治理 Agent，LLM） ——

const GOVERNANCE_REGISTRY: Record<string, () => GovernanceProvider> = {
  mock: () => new MockGovernanceProvider(),
  api: () => new GovernanceAdapter(),
};

let govCached: GovernanceProvider | null = null;
let govLastCachedName: string | null = null;

export function getGovernanceProvider(name?: string): GovernanceProvider {
  const active = name ?? useApiConfigStore.getState().configs.governance.active;
  if (govCached && govLastCachedName === active) return govCached;
  const factory = GOVERNANCE_REGISTRY[active] ?? GOVERNANCE_REGISTRY.mock;
  const provider = factory();
  govCached = provider;
  govLastCachedName = active;
  return provider;
}

export function listGovernanceProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Governance (规则引擎)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: true },
  ];
}

// —— ④ PortalProvider（门户 AI 检索导航，LLM） ——

const PORTAL_REGISTRY: Record<string, () => PortalProvider> = {
  mock: () => new MockPortalProvider(),
  api: () => new PortalAdapter(),
};

let portalCached: PortalProvider | null = null;
let portalLastCachedName: string | null = null;

export function getPortalProvider(name?: string): PortalProvider {
  const active = name ?? useApiConfigStore.getState().configs.portal.active;
  if (portalCached && portalLastCachedName === active) return portalCached;
  const factory = PORTAL_REGISTRY[active] ?? PORTAL_REGISTRY.mock;
  const provider = factory();
  portalCached = provider;
  portalLastCachedName = active;
  return provider;
}

export function listPortalProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Portal (演示脚本)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: true },
  ];
}
