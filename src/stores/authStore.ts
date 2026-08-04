import { create } from 'zustand';

export type UserRole = 'teacher' | 'student';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  title: string; // 教师: 学科/职称；学生: 年级
  avatarColor: string;
}

interface AuthState {
  user: AuthUser | null;
  stage: 'boot' | 'login' | 'desktop';
  bootProgress: number;
  login: (user: AuthUser) => void;
  logout: () => void;
  setStage: (stage: AuthState['stage']) => void;
  setBootProgress: (p: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  stage: 'boot',
  bootProgress: 0,
  login: (user) => set({ user, stage: 'desktop' }),
  logout: () => set({ user: null, stage: 'login' }),
  setStage: (stage) => set({ stage }),
  setBootProgress: (bootProgress) => set({ bootProgress }),
}));

// 预设账户
export const TEACHER_USER: AuthUser = {
  id: 't1',
  name: '李建国',
  role: 'teacher',
  title: '物理高级教师',
  avatarColor: '#000080',
};

export const STUDENT_USER: AuthUser = {
  id: 's1',
  name: '张明',
  role: 'student',
  title: '高二·三班',
  avatarColor: '#008000',
};
