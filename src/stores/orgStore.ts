import { create } from 'zustand';
import { getDB } from '../data/localStorage';
import type { OrgSnapshot } from '../harness/types';

/**
 * 组织架构 Store
 * 从 LocalStorage 读取组织实体，提供查询辅助方法。
 * 数据静态（种子），无需响应式更新。
 */
interface OrgState {
  getOrgSnapshot(): OrgSnapshot;
  getClassName(id: string): string;
  getSubjectName(id: string): string;
  getTermName(id: string): string;
  getGradeName(id: string): string;
  getCurrentTermId(): string;
}

export const useOrgStore = create<OrgState>(() => ({
  getOrgSnapshot(): OrgSnapshot {
    const db = getDB();
    return {
      schools: db.schools.map((s) => ({ id: s.id, name: s.name, type: s.type })),
      terms: db.terms.map((t) => ({ id: t.id, name: t.name, isCurrent: t.isCurrent })),
      grades: db.grades.map((g) => ({ id: g.id, name: g.name, schoolId: g.schoolId })),
      classes: db.classes.map((c) => ({ id: c.id, name: c.name, gradeId: c.gradeId, studentCount: c.studentCount })),
      subjects: db.subjects.map((s) => ({ id: s.id, name: s.name })),
    };
  },

  getClassName(id: string): string {
    return getDB().classes.find((c) => c.id === id)?.name ?? id;
  },

  getSubjectName(id: string): string {
    return getDB().subjects.find((s) => s.id === id)?.name ?? id;
  },

  getTermName(id: string): string {
    return getDB().terms.find((t) => t.id === id)?.name ?? id;
  },

  getGradeName(id: string): string {
    return getDB().grades.find((g) => g.id === id)?.name ?? id;
  },

  getCurrentTermId(): string {
    return getDB().terms.find((t) => t.isCurrent)?.id ?? getDB().terms[getDB().terms.length - 1].id;
  },
}));

/** 非 React 上下文下的便捷访问 */
export const orgStore = useOrgStore.getState;
