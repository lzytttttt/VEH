import type { ScenarioType } from '../harness/types';

/** 学校 */
export interface SchoolRecord {
  id: string;
  name: string;
  /** 学段: 小学/初中/高中/中职/高职/高校 */
  type: string;
}

/** 学期 */
export interface TermRecord {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/** 年级 */
export interface GradeRecord {
  id: string;
  name: string;
  schoolId: string;
}

/** 班级 */
export interface ClassRecord {
  id: string;
  name: string;
  gradeId: string;
  studentCount: number;
  headTeacherId: string;
}

/** 学科 */
export interface SubjectRecord {
  id: string;
  name: string;
}

export interface SessionRecord {
  id: string;
  scenario: ScenarioType;
  title: string;
  teacherId: string;
  teacherName: string;
  date: string; // ISO date
  duration: number;
  metrics: {
    teaching: number;
    engagement: number;
    interaction: number;
    compliance: number;
    innovation: number;
  };
  studentCount: number;
  note?: string;
  /** 组织上下文（v2 新增） */
  classId: string;
  gradeId: string;
  termId: string;
  subjectId: string;
}

export interface TeacherProfileRecord {
  id: string;
  name: string;
  subject: string;
  title: string;
  sessionIds: string[];
  /** 教研组（v2 新增） */
  department?: string;
  /** 担任班主任的班级（v2 新增） */
  classIds?: string[];
}

export interface StudentProfileRecord {
  id: string;
  name: string;
  grade: string;
  sessionIds: string[];
  /** 所属班级（v2 新增） */
  classId?: string;
  gradeId?: string;
}

export interface NoteRecord {
  id: string;
  scenarioId: string;
  scenarioLabel: string;
  t: number;
  content: string;
  pinned: boolean;
  createdAt: number;
}

export interface StorageSchema {
  version: 2;
  schools: SchoolRecord[];
  terms: TermRecord[];
  grades: GradeRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  sessions: SessionRecord[];
  teacherProfiles: TeacherProfileRecord[];
  studentProfiles: StudentProfileRecord[];
  notes: NoteRecord[];
}

export const STORAGE_VERSION = 2;
export const STORAGE_KEY = 'vlm-edu-hub:db';
