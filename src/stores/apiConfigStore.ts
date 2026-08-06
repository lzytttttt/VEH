import { create } from 'zustand';

/**
 * API 接入配置 Store — 6 个 Provider 各自独立切换的单一真相源
 *
 * 对齐《VLM / LLM API 接入指南》：
 * - §7.1 中央注册中心的 4 个独立 ACTIVE_*（VLM/Capability/Governance/Portal）
 * - §7.2 教案/课件物理隔离独立 Harness 的 ACTIVE
 * - Q5「每个 Provider 独立切换，可只接一部分其余保持 Mock」
 *
 * 每个条目含独立的 active/baseURL/apiKey/model，互不影响。
 * 持久化对齐 src/data/localStorage.ts：debounced 300ms + try/catch 容错 + 独立 key。
 */

export type ProviderKey =
  | 'vlm'
  | 'capability'
  | 'governance'
  | 'portal'
  | 'lessonPlan'
  | 'slides';

export interface ProviderConfig {
  /** vlm: 'mock'|'openai'|'qwen'|'vllm'；其余: 'mock'|'api' */
  active: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = 'vlm-edu-hub:api-config';

/**
 * 默认配置：active 全为 mock，baseURL 默认走 Vite 代理 `/api/llm`（避 CORS），
 * 上游目标在 vite.config.ts 中配置（默认 https://opencode.ai/zen/go/v1）。
 * 切到真实 API 时：面板填入 API Key + 可选调整 Model 即可，baseURL 保持相对路径。
 * 也可改为绝对 URL 自接任意 OpenAI 兼容端点（需自行确保后端/CORS）。
 */
export const DEFAULT_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  vlm: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  capability: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  governance: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  portal: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  lessonPlan: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  slides: {
    active: 'mock',
    baseURL: '/api/llm',
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
};

/** VLM 子适配器切换时套用的预设（openai/qwen/vllm 各 Provider 仓库默认） */
export const VLM_PRESETS: Record<string, Partial<ProviderConfig>> = {
  openai: { baseURL: '/api/llm', model: 'gpt-4o', apiKey: '' },
  qwen: { baseURL: 'https://dashscope.aliyuncs.com/api/v1', model: 'qwen-vl-max', apiKey: '' },
  vllm: { baseURL: 'http://localhost:8000/v1', model: 'Qwen/Qwen2-VL-7B-Instruct', apiKey: 'EMPTY' },
};

/** 每个 Provider 允许的 active 取值（对齐各 REGISTRY 注册项） */
export const PROVIDER_OPTIONS: Record<ProviderKey, { id: string; label: string }[]> = {
  vlm: [
    { id: 'mock', label: 'Mock（预制剧本）' },
    { id: 'openai', label: 'OpenAI 兼容' },
    { id: 'qwen', label: '通义千问 Qwen-VL' },
    { id: 'vllm', label: 'VLLM 本地部署' },
  ],
  capability: [
    { id: 'mock', label: 'Mock（脚本派生）' },
    { id: 'api', label: '模型 API' },
  ],
  governance: [
    { id: 'mock', label: 'Mock（规则引擎）' },
    { id: 'api', label: 'LLM API' },
  ],
  portal: [
    { id: 'mock', label: 'Mock（演示脚本）' },
    { id: 'api', label: 'LLM API' },
  ],
  lessonPlan: [
    { id: 'mock', label: 'Mock（教学模板）' },
    { id: 'api', label: 'LLM API' },
  ],
  slides: [
    { id: 'mock', label: 'Mock（课件模板）' },
    { id: 'api', label: 'LLM API' },
  ],
};

export const PROVIDER_META: Record<ProviderKey, { title: string; desc: string; modelType: 'VLM' | 'LLM' }> = {
  vlm: { title: 'VLM 课堂分析', desc: '多模态视觉语言模型，看图说话产出事件/指标', modelType: 'VLM' },
  capability: { title: '能力提升', desc: '知识 WIKI / 演练 / 游戏取数', modelType: 'LLM' },
  governance: { title: '学校治理', desc: '治理简报 / 对话洞察 / 异常预警', modelType: 'LLM' },
  portal: { title: '门户导航', desc: 'AI 检索导航 / 快捷入口', modelType: 'LLM' },
  lessonPlan: { title: '教案生成', desc: '教案草稿流式生成与微调', modelType: 'LLM' },
  slides: { title: '课件生成', desc: '课件草稿按页流式生成与微调', modelType: 'LLM' },
};

function cloneDefaults(): Record<ProviderKey, ProviderConfig> {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
}

let writeTimer: number | null = null;

function persist(configs: Record<ProviderKey, ProviderConfig>): void {
  if (writeTimer != null) clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error('apiConfig persist failed', e);
    }
  }, 300);
}

function loadConfigs(): Record<ProviderKey, ProviderConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<Record<ProviderKey, Partial<ProviderConfig>>>;
    const merged = cloneDefaults();
    (Object.keys(merged) as ProviderKey[]).forEach((k) => {
      if (parsed[k]) merged[k] = { ...merged[k], ...parsed[k] };
    });
    return merged;
  } catch (e) {
    console.error('apiConfig load failed', e);
    return cloneDefaults();
  }
}

interface ApiConfigState {
  configs: Record<ProviderKey, ProviderConfig>;
  /** 独立更新某个 Provider 的部分字段 */
  setProvider: (key: ProviderKey, patch: Partial<ProviderConfig>) => void;
  /** 全部恢复默认 */
  resetToDefaults: () => void;
}

export const useApiConfigStore = create<ApiConfigState>((set) => ({
  configs: loadConfigs(),
  setProvider: (key, patch) =>
    set((state) => {
      const configs = {
        ...state.configs,
        [key]: { ...state.configs[key], ...patch },
      };
      persist(configs);
      return { configs };
    }),
  resetToDefaults: () => {
    const configs = cloneDefaults();
    persist(configs);
    set({ configs });
  },
}));

/** 非 React 上下文下读取某 Provider 当前配置（注册中心 / Adapter 懒读取用） */
export function getProviderConfig(key: ProviderKey): ProviderConfig {
  return useApiConfigStore.getState().configs[key];
}
