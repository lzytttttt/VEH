import type {
  NoteRecord,
  SessionRecord,
  StudentProfileRecord,
  TeacherProfileRecord,
} from './types';

// 种子 session：5 个场景的预设历史
export const seedSessions: SessionRecord[] = [
  {
    id: 'seed-classroom-1',
    scenario: 'classroom',
    title: '高一物理 · 牛顿第二定律',
    teacherId: 't1',
    teacherName: '李建国',
    date: '2025-09-12',
    duration: 180,
    metrics: { teaching: 0.88, engagement: 0.82, interaction: 0.85, compliance: 0.92, innovation: 0.78 },
    studentCount: 38,
    note: '本节核心：F=ma 公式推导与实验演示',
  },
  {
    id: 'seed-pe-1',
    scenario: 'pe',
    title: '高二体育 · 篮球运球技术',
    teacherId: 't1',
    teacherName: '李建国',
    date: '2025-09-15',
    duration: 150,
    metrics: { teaching: 0.86, engagement: 0.9, interaction: 0.82, compliance: 0.88, innovation: 0.8 },
    studentCount: 32,
  },
  {
    id: 'seed-lab-1',
    scenario: 'lab',
    title: '高二化学 · 酸碱中和滴定',
    teacherId: 't1',
    teacherName: '李建国',
    date: '2025-09-19',
    duration: 200,
    metrics: { teaching: 0.9, engagement: 0.85, interaction: 0.8, compliance: 0.96, innovation: 0.75 },
    studentCount: 24,
  },
  {
    id: 'seed-workshop-1',
    scenario: 'workshop',
    title: '实训车间 · 普通车削加工',
    teacherId: 't1',
    teacherName: '李建国',
    date: '2025-09-22',
    duration: 220,
    metrics: { teaching: 0.9, engagement: 0.83, interaction: 0.78, compliance: 0.95, innovation: 0.7 },
    studentCount: 16,
  },
  {
    id: 'seed-microlesson-1',
    scenario: 'microlesson',
    title: '高三数学微课 · 函数单调性',
    teacherId: 't1',
    teacherName: '李建国',
    date: '2025-09-26',
    duration: 180,
    metrics: { teaching: 0.92, engagement: 0.86, interaction: 0.7, compliance: 0.95, innovation: 0.82 },
    studentCount: 3,
  },
];

export const seedTeacherProfile: TeacherProfileRecord = {
  id: 't1',
  name: '李建国',
  subject: '物理',
  title: '高级教师',
  sessionIds: seedSessions.map((s) => s.id),
};

export const seedStudentProfile: StudentProfileRecord = {
  id: 's1',
  name: '张明',
  grade: '高二·三班',
  sessionIds: seedSessions.map((s) => s.id),
};

export const seedNotes: NoteRecord[] = [
  {
    id: 'seed-note-1',
    scenarioId: 'classroom',
    scenarioLabel: '🏫 物理·牛顿第二定律',
    t: 32,
    content: 'F=ma 公式：合外力 = 质量 × 加速度。加速度方向与合外力方向一致。',
    pinned: true,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'seed-note-2',
    scenarioId: 'lab',
    scenarioLabel: '🔬 化学·酸碱中和滴定',
    t: 75,
    content: '半滴操作：液滴悬于管口，靠瓶壁接入。保证精度<0.1%误差。',
    pinned: true,
    createdAt: Date.now() - 172800000,
  },
  {
    id: 'seed-note-3',
    scenarioId: 'microlesson',
    scenarioLabel: '🎥 数学·函数单调性',
    t: 105,
    content: 'ln(x) 求导 1/x，定义域 x>0 时恒正故递增。',
    pinned: false,
    createdAt: Date.now() - 259200000,
  },
];
