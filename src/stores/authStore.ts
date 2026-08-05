import { create } from 'zustand';

export type UserRole = 'teacher' | 'student' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  title: string; // 教师: 学科/职称；学生: 年级；管理: 岗位
  avatarColor: string;
  orgId?: string;
  classId?: string;
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

export const ADMIN_USER: AuthUser = {
  id: 'a1',
  name: '王校长',
  role: 'admin',
  title: '管理岗位',
  avatarColor: '#800080',
  orgId: 'school-1',
};
