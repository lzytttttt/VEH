import {
  STORAGE_KEY,
  STORAGE_VERSION,
  type NoteRecord,
  type SessionRecord,
  type StorageSchema,
} from './types';
import {
  seedClasses,
  seedGrades,
  seedSchools,
  seedSubjects,
  seedTerms,
  seedSessions,
  seedTeacherProfile,
  seedStudentProfile,
  seedNotes,
} from './seed';
export type { NoteRecord, SessionRecord } from './types';

let cache: StorageSchema | null = null;
let writeTimer: number | null = null;

const LEGACY_STORAGE_KEY = 'vlm-classroom:db';

/** v1 schema 结构（迁移用） */
interface StorageSchemaV1 {
  version: number;
  sessions: Array<Omit<SessionRecord, 'classId' | 'gradeId' | 'termId' | 'subjectId'>>;
  teacherProfiles: StorageSchema['teacherProfiles'];
  studentProfiles: StorageSchema['studentProfiles'];
  notes: NoteRecord[];
}

/** v1 → v2 渐进迁移：保留旧 session 数据，补全组织字段默认值 */
function migrateV1toV2(v1: StorageSchemaV1): StorageSchema {
  const DEFAULT_TERM = seedTerms[0].id;
  const DEFAULT_CLASS = seedClasses[0].id;
  const DEFAULT_GRADE = seedGrades[0].id;
  const DEFAULT_SUBJECT = seedSubjects[0].id;
  return {
    version: 2,
    schools: seedSchools,
    terms: seedTerms,
    grades: seedGrades,
    classes: seedClasses,
    subjects: seedSubjects,
    sessions: v1.sessions.map((s) => ({
      ...s,
      classId: DEFAULT_CLASS,
      gradeId: DEFAULT_GRADE,
      termId: DEFAULT_TERM,
      subjectId: DEFAULT_SUBJECT,
    })),
    teacherProfiles: v1.teacherProfiles,
    studentProfiles: v1.studentProfiles,
    notes: v1.notes,
  };
}

function loadFromStorage(): StorageSchema {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // 一次性迁移旧 key（vlm-classroom:db → vlm-edu-hub:db），保留老用户数据
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        raw = legacy;
      }
    }
    if (!raw) return seedSchema();
    const parsed = JSON.parse(raw) as { version: number };
    // 渐进迁移：v1 → v2
    if (parsed.version === 1) {
      const migrated = migrateV1toV2(JSON.parse(raw) as StorageSchemaV1);
      cache = migrated;
      persist();
      return migrated;
    }
    if (parsed.version !== STORAGE_VERSION) {
      // 未知版本，回退到 seed
      return seedSchema();
    }
    return JSON.parse(raw) as StorageSchema;
  } catch (e) {
    console.error('LocalStorage load failed', e);
    return seedSchema();
  }
}

function seedSchema(): StorageSchema {
  return {
    version: STORAGE_VERSION,
    schools: seedSchools,
    terms: seedTerms,
    grades: seedGrades,
    classes: seedClasses,
    subjects: seedSubjects,
    sessions: seedSessions,
    teacherProfiles: [seedTeacherProfile],
    studentProfiles: [seedStudentProfile],
    notes: seedNotes,
  };
}

function persist() {
  if (writeTimer != null) clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    if (!cache) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('LocalStorage persist failed', e);
    }
  }, 300);
}

export function getDB(): StorageSchema {
  if (cache) return cache;
  cache = loadFromStorage();
  return cache;
}

export function saveSession(record: SessionRecord): void {
  const db = getDB();
  const idx = db.sessions.findIndex((s) => s.id === record.id);
  if (idx >= 0) {
    db.sessions[idx] = record;
  } else {
    db.sessions.push(record);
  }
  persist();
}

export function listSessions(): SessionRecord[] {
  return getDB().sessions;
}

export function listNotes(): NoteRecord[] {
  return getDB().notes;
}

export function saveNote(note: NoteRecord): void {
  const db = getDB();
  const idx = db.notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    db.notes[idx] = note;
  } else {
    db.notes.push(note);
  }
  persist();
}

export function deleteNote(id: string): void {
  const db = getDB();
  db.notes = db.notes.filter((n) => n.id !== id);
  persist();
}

export function resetDB(): void {
  cache = seedSchema();
  persist();
}
