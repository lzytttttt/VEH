import { create } from 'zustand';
import { getScript } from '../harness/MockVLMProvider';
import type { ScenarioType, WikiNode } from '../harness/types';

interface WikiState {
  activeScenario: ScenarioType;
  selectedNodeId: string | null;
  nodes: WikiNode[];
  setScenario: (s: ScenarioType) => void;
  selectNode: (id: string | null) => void;
}

export const useWikiStore = create<WikiState>((set) => ({
  activeScenario: 'classroom',
  selectedNodeId: null,
  nodes: getScript('classroom').wiki.nodes,

  setScenario: (s) => {
    const script = getScript(s);
    set({
      activeScenario: s,
      nodes: script.wiki.nodes,
      selectedNodeId: script.wiki.nodes[0]?.id ?? null,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),
}));
