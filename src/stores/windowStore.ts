import { create } from 'zustand';
import type { ReactNode } from 'react';

export interface WindowInstance {
  id: string;
  title: string;
  icon: string; // emoji 或 emoji-like 字符
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized?: boolean;
  content: ReactNode;
  closable?: boolean;
}

interface WindowState {
  windows: WindowInstance[];
  nextZ: number;
  openWindow: (w: Omit<WindowInstance, 'zIndex' | 'minimized'>) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  isMinimized: (id: string) => boolean;
  getActiveId: () => string | null;
}

const findTopZ = (windows: WindowInstance[]) => {
  return windows.reduce((max, w) => Math.max(max, w.zIndex), 100);
};

export const useWindowStore = create<WindowState>((set, get) => ({
  windows: [],
  nextZ: 100,

  openWindow: (w) => {
    const state = get();
    // 已开则聚焦
    const existing = state.windows.find((win) => win.id === w.id);
    if (existing) {
      get().focusWindow(w.id);
      if (existing.minimized) {
        get().restoreWindow(w.id);
      }
      return w.id;
    }
    const z = state.nextZ + 1;
    const instance: WindowInstance = {
      ...w,
      zIndex: z,
      minimized: false,
    };
    set((s) => ({
      windows: [...s.windows, instance],
      nextZ: z,
    }));
    return w.id;
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) =>
    set((s) => {
      const z = s.nextZ + 1;
      return {
        nextZ: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: z, minimized: false } : w)),
      };
    }),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    })),

  restoreWindow: (id) => {
    get().focusWindow(id);
  },

  toggleMaximize: (id) =>
    set((s) => {
      const z = s.nextZ + 1;
      return {
        nextZ: z,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, maximized: !w.maximized, minimized: false, zIndex: z } : w
        ),
      };
    }),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  isMinimized: (id) => {
    const w = get().windows.find((win) => win.id === id);
    return w ? w.minimized : false;
  },

  getActiveId: () => {
    const ws = get().windows.filter((w) => !w.minimized);
    if (ws.length === 0) return null;
    return ws.reduce((top, w) => (w.zIndex > top.zIndex ? w : top)).id;
  },
}));
