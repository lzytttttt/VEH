import { create } from 'zustand';
import type { EvalResult, EvalTarget } from './types';

const STORAGE_KEY = 'vlm-edu-hub:eval-trend';

/** 预填 5 次历史评分（Mock 模式下展示质量上升趋势线） */
const SEED_TREND: EvalResult[] = [
  { target: 'lessonPlan', score: 8, passed: true, dimensions: [], issues: [], method: 'rule', timestamp: Date.now() - 5 * 86400000 },
  { target: 'lessonPlan', score: 6, passed: false, dimensions: [], issues: ['缺失板书设计'], method: 'rule', timestamp: Date.now() - 4 * 86400000 },
  { target: 'lessonPlan', score: 8, passed: true, dimensions: [], issues: [], method: 'rule', timestamp: Date.now() - 3 * 86400000 },
  { target: 'lessonPlan', score: 7, passed: true, dimensions: [], issues: [], method: 'rule', timestamp: Date.now() - 2 * 86400000 },
  { target: 'lessonPlan', score: 9, passed: true, dimensions: [], issues: [], method: 'rule', timestamp: Date.now() - 1 * 86400000 },
];

function load(): EvalResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_TREND;
    const parsed = JSON.parse(raw) as EvalResult[];
    return Array.isArray(parsed) ? parsed : SEED_TREND;
  } catch {
    return SEED_TREND;
  }
}

let writeTimer: number | null = null;
function persist(results: EvalResult[]): void {
  if (writeTimer != null) clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (e) {
      console.error('evalStore persist failed', e);
    }
  }, 300);
}

interface EvalState {
  results: EvalResult[];
  /** 记录一次评估（保留最近 50 条） */
  addResult(result: EvalResult): void;
  /** 按对象过滤趋势 */
  trend(target?: EvalTarget): EvalResult[];
  /** 清空（含 seed） */
  clear(): void;
}

export const useEvalStore = create<EvalState>((set, get) => ({
  results: load(),
  addResult: (result) => {
    const next = [...get().results, result].slice(-50);
    persist(next);
    set({ results: next });
  },
  trend: (target) => {
    const all = get().results;
    return target ? all.filter((r) => r.target === target) : all;
  },
  clear: () => {
    persist([]);
    set({ results: [] });
  },
}));
