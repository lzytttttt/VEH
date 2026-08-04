import { create } from 'zustand';
import { listSessions, saveSession, type SessionRecord } from '../data/localStorage';
import { getScript } from '../harness/MockVLMProvider';
import type { ScenarioType } from '../harness/types';

interface SessionState {
  sessions: SessionRecord[];
  /** 当场景分析"完成"时，将剧本 metrics 落库为 session 记录 */
  recordSession: (scenario: ScenarioType) => SessionRecord | null;
  list: () => SessionRecord[];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: listSessions(),

  recordSession: (scenario) => {
    const script = getScript(scenario);
    if (!script) return null;
    const record: SessionRecord = {
      id: `${scenario}-${Date.now()}`,
      scenario,
      title: script.title,
      teacherId: 't1',
      teacherName: '李建国',
      date: new Date().toISOString().slice(0, 10),
      duration: script.duration,
      metrics: script.metrics,
      studentCount: script.students.length,
      note: '由本次实时分析自动生成',
    };
    saveSession(record);
    set({ sessions: listSessions() });
    return record;
  },

  list: () => get().sessions,
}));
