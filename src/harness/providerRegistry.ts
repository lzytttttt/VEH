import type { VLMProvider } from './types';
import { MockVLMProvider } from './MockVLMProvider';
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { QwenAdapter } from './adapters/QwenAdapter';
import { VLLMAdapter } from './adapters/VLLMAdapter';

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
