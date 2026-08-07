import type { MemoryStore } from './types';

const STORAGE_KEY = 'vlm-edu-hub:agent-memory';
const TOOL_SUPPORT_KEY = 'toolSupport';

interface PersistedMemory {
  toolSupport?: Record<string, boolean>;
  preferences?: Record<string, unknown>;
}

function load(): PersistedMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedMemory;
  } catch (e) {
    console.warn('MemoryStore load failed', e);
    return {};
  }
}

let writeTimer: number | null = null;
function persist(data: PersistedMemory): void {
  if (writeTimer != null) clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('MemoryStore persist failed', e);
    }
  }, 300);
}

/**
 * 跨会话记忆（LocalStorage 持久化）
 *
 * 当前承载：模型 tools 能力探测缓存（避免每次任务都试探）。
 * 预留 preferences 字段供 P2b/P4 写入用户偏好与历史摘要。
 */
export class AgentMemoryStore implements MemoryStore {
  private data: PersistedMemory = load();

  getToolSupport(model: string): boolean | undefined {
    return this.data.toolSupport?.[model];
  }

  setToolSupport(model: string, supported: boolean): void {
    if (!this.data.toolSupport) this.data.toolSupport = {};
    this.data.toolSupport[model] = supported;
    persist(this.data);
  }

  getPreference(key: string): unknown {
    return this.data.preferences?.[key];
  }

  setPreference(key: string, value: unknown): void {
    if (!this.data.preferences) this.data.preferences = {};
    this.data.preferences[key] = value;
    persist(this.data);
  }
}
