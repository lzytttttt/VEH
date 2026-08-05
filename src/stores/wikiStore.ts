import { create } from 'zustand';
import { getCapabilityProvider } from '../harness/providerRegistry';
import type { ScenarioType, WikiNode } from '../harness/types';

interface WikiState {
  activeScenario: ScenarioType;
  selectedNodeId: string | null;
  nodes: WikiNode[];
  loading: boolean;
  /** 切换场景并经 CapabilityProvider 异步加载 wiki（闭合绕过 provider 的缺口） */
  setScenario: (s: ScenarioType) => void;
  selectNode: (id: string | null) => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  activeScenario: 'classroom',
  selectedNodeId: null,
  nodes: [],
  loading: false,

  setScenario: (s) => {
    set({ activeScenario: s, loading: true, selectedNodeId: null });
    getCapabilityProvider()
      .getWiki(s)
      .then((w) => {
        set({ nodes: w.nodes, selectedNodeId: w.nodes[0]?.id ?? null, loading: false });
      })
      .catch((e) => {
        console.error('WikiStore load wiki failed', e);
        set({ loading: false });
      });
  },

  selectNode: (id) => set({ selectedNodeId: id }),
}));
