import type { ScenarioType } from '../harness/types';

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
}

export interface TeacherProfileRecord {
  id: string;
  name: string;
  subject: string;
  title: string;
  sessionIds: string[];
}

export interface StudentProfileRecord {
  id: string;
  name: string;
  grade: string;
  sessionIds: string[];
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
  version: number;
  sessions: SessionRecord[];
  teacherProfiles: TeacherProfileRecord[];
  studentProfiles: StudentProfileRecord[];
  notes: NoteRecord[];
}

export const STORAGE_VERSION = 1;
export const STORAGE_KEY = 'vlm-edu-hub:db';
