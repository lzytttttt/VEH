import { STORAGE_KEY, STORAGE_VERSION, type NoteRecord, type SessionRecord, type StorageSchema } from './types';
import { seedSessions, seedTeacherProfile, seedStudentProfile, seedNotes } from './seed';

let cache: StorageSchema | null = null;
let writeTimer: number | null = null;

function loadFromStorage(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSchema();
    const parsed = JSON.parse(raw) as StorageSchema;
    if (parsed.version !== STORAGE_VERSION) {
      // schema 不匹配，回退到 seed
      return seedSchema();
    }
    return parsed;
  } catch (e) {
    console.error('LocalStorage load failed', e);
    return seedSchema();
  }
}

function seedSchema(): StorageSchema {
  return {
    version: STORAGE_VERSION,
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
