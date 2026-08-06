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

const REGISTRY: Record<string, () => VLMProvider> = {
  mock: () => new MockVLMProvider(),
  openai: () => new OpenAIAdapter(),
  qwen: () => new QwenAdapter(),
  vllm: () => new VLLMAdapter(),
};

const ACTIVE_PROVIDER = 'mock';

let cached: VLMProvider | null = null;

export function getProvider(name: string = ACTIVE_PROVIDER): VLMProvider {
  if (name === ACTIVE_PROVIDER && cached) return cached;
  const factory = REGISTRY[name] ?? REGISTRY[ACTIVE_PROVIDER];
  const provider = factory();
  if (name === ACTIVE_PROVIDER) cached = provider;
  return provider;
}

export function listProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Provider (预制剧本)', available: true },
    { id: 'openai', name: 'OpenAI 兼容接口', available: false },
    { id: 'qwen', name: '通义千问 Qwen', available: false },
    { id: 'vllm', name: 'VLLM 本地部署', available: false },
  ];
}

// —— 能力提升 Provider（与 VLMProvider 并行，共用同一注册文件保持一致性） ——

const CAPABILITY_REGISTRY: Record<string, () => CapabilityProvider> = {
  mock: () => new MockCapabilityProvider(),
  api: () => new CapabilityAdapter(),
};

const ACTIVE_CAPABILITY_PROVIDER = 'mock';

let capCached: CapabilityProvider | null = null;

export function getCapabilityProvider(name: string = ACTIVE_CAPABILITY_PROVIDER): CapabilityProvider {
  if (name === ACTIVE_CAPABILITY_PROVIDER && capCached) return capCached;
  const factory = CAPABILITY_REGISTRY[name] ?? CAPABILITY_REGISTRY[ACTIVE_CAPABILITY_PROVIDER];
  const provider = factory();
  if (name === ACTIVE_CAPABILITY_PROVIDER) capCached = provider;
  return provider;
}

export function listCapabilityProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Capability (脚本派生)', available: true },
    { id: 'api', name: '模型 API Adapter', available: false },
  ];
}

// —— 治理 Provider（与 VLMProvider/CapabilityProvider 并列，共用同一注册文件保持一致性） ——

const GOVERNANCE_REGISTRY: Record<string, () => GovernanceProvider> = {
  mock: () => new MockGovernanceProvider(),
  api: () => new GovernanceAdapter(),
};

const ACTIVE_GOVERNANCE_PROVIDER = 'mock';

let govCached: GovernanceProvider | null = null;

export function getGovernanceProvider(name: string = ACTIVE_GOVERNANCE_PROVIDER): GovernanceProvider {
  if (name === ACTIVE_GOVERNANCE_PROVIDER && govCached) return govCached;
  const factory = GOVERNANCE_REGISTRY[name] ?? GOVERNANCE_REGISTRY[ACTIVE_GOVERNANCE_PROVIDER];
  const provider = factory();
  if (name === ACTIVE_GOVERNANCE_PROVIDER) govCached = provider;
  return provider;
}

export function listGovernanceProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Governance (规则引擎)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: false },
  ];
}

// —— 门户 Provider（与 VLM/Capability/Governance 并列第四 Provider，共用同一注册文件保持一致性） ——

const PORTAL_REGISTRY: Record<string, () => PortalProvider> = {
  mock: () => new MockPortalProvider(),
  api: () => new PortalAdapter(),
};

const ACTIVE_PORTAL_PROVIDER = 'mock';

let portalCached: PortalProvider | null = null;

export function getPortalProvider(name: string = ACTIVE_PORTAL_PROVIDER): PortalProvider {
  if (name === ACTIVE_PORTAL_PROVIDER && portalCached) return portalCached;
  const factory = PORTAL_REGISTRY[name] ?? PORTAL_REGISTRY[ACTIVE_PORTAL_PROVIDER];
  const provider = factory();
  if (name === ACTIVE_PORTAL_PROVIDER) portalCached = provider;
  return provider;
}

export function listPortalProviders(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Portal (演示脚本)', available: true },
    { id: 'api', name: 'LLM API Adapter', available: false },
  ];
}
