import { create } from 'zustand';
import { listSessions, type SessionRecord } from '../data/localStorage';

interface ProfileState {
  sessions: SessionRecord[];
  refresh: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  sessions: listSessions(),
  refresh: () => set({ sessions: listSessions() }),
}));
