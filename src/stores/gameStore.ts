import { create } from 'zustand';

const KEY = 'vlm-edu-hub:gamescores';
type ScoreMap = Record<string, number>;

function load(): ScoreMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as ScoreMap;
  } catch (e) {
    console.error('gameStore load failed', e);
    return {};
  }
}

function save(m: ScoreMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch (e) {
    console.error('gameStore save failed', e);
  }
}

interface GameStore {
  best: ScoreMap;
  /** 记录某游戏模块的最佳得分（仅当更高时更新） */
  recordBest: (moduleId: string, score: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  best: load(),
  recordBest: (id, score) => {
    const prev = get().best[id] ?? 0;
    if (score <= prev) return;
    const next = { ...get().best, [id]: score };
    save(next);
    set({ best: next });
  },
}));
