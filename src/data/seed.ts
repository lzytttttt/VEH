import type {
  ClassRecord,
  GradeRecord,
  NoteRecord,
  SchoolRecord,
  SessionRecord,
  StudentProfileRecord,
  SubjectRecord,
  TeacherProfileRecord,
  TermRecord,
} from './types';

// ============ 组织实体 ============

export const seedSchools: SchoolRecord[] = [
  { id: 'school-1', name: '示范综合中学', type: '高中' },
];

export const seedTerms: TermRecord[] = [
  { id: 'term-2024-fall', name: '2024-2025学年第一学期', startDate: '2024-09-01', endDate: '2025-01-20', isCurrent: false },
  { id: 'term-2025-spring', name: '2024-2025学年第二学期', startDate: '2025-02-20', endDate: '2025-07-10', isCurrent: false },
  { id: 'term-2025-fall', name: '2025-2026学年第一学期', startDate: '2025-09-01', endDate: '2026-01-20', isCurrent: true },
];

export const seedGrades: GradeRecord[] = [
  { id: 'grade-1', name: '高一', schoolId: 'school-1' },
  { id: 'grade-2', name: '高二', schoolId: 'school-1' },
  { id: 'grade-3', name: '高三', schoolId: 'school-1' },
];

export const seedClasses: ClassRecord[] = [
  { id: 'class-1-1', name: '高一·一班', gradeId: 'grade-1', studentCount: 40, headTeacherId: 't1' },
  { id: 'class-1-2', name: '高一·二班', gradeId: 'grade-1', studentCount: 38, headTeacherId: 't2' },
  { id: 'class-2-1', name: '高二·一班', gradeId: 'grade-2', studentCount: 42, headTeacherId: 't3' },
  { id: 'class-2-3', name: '高二·三班', gradeId: 'grade-2', studentCount: 38, headTeacherId: 't4' },
  { id: 'class-3-1', name: '高三·一班', gradeId: 'grade-3', studentCount: 36, headTeacherId: 't5' },
];

export const seedSubjects: SubjectRecord[] = [
  { id: 'subj-physics', name: '物理' },
  { id: 'subj-chemistry', name: '化学' },
  { id: 'subj-math', name: '数学' },
  { id: 'subj-pe', name: '体育' },
  { id: 'subj-training', name: '实训' },
];

// ============ 教师档案 ============

export const seedTeacherProfiles: TeacherProfileRecord[] = [
  { id: 't1', name: '李建国', subject: '物理', title: '高级教师', department: '理化生教研组', classIds: ['class-1-1', 'class-2-3'], sessionIds: [] },
  { id: 't2', name: '王芳', subject: '化学', title: '一级教师', department: '理化生教研组', classIds: ['class-1-2'], sessionIds: [] },
  { id: 't3', name: '张伟', subject: '数学', title: '高级教师', department: '数学教研组', classIds: ['class-2-1'], sessionIds: [] },
  { id: 't4', name: '刘洋', subject: '体育', title: '二级教师', department: '体艺教研组', classIds: ['class-2-3'], sessionIds: [] },
  { id: 't5', name: '陈静', subject: '实训', title: '高级教师', department: '实训教研组', classIds: ['class-3-1'], sessionIds: [] },
];

export const seedTeacherProfile = seedTeacherProfiles[0];

// ============ 学生档案 ============

export const seedStudentProfiles: StudentProfileRecord[] = [
  { id: 's1', name: '张明', grade: '高二·三班', classId: 'class-2-3', gradeId: 'grade-2', sessionIds: [] },
  { id: 's2', name: '李娜', grade: '高二·三班', classId: 'class-2-3', gradeId: 'grade-2', sessionIds: [] },
  { id: 's3', name: '赵磊', grade: '高二·一班', classId: 'class-2-1', gradeId: 'grade-2', sessionIds: [] },
];

export const seedStudentProfile = seedStudentProfiles[0];

// ============ 课堂会话种子（3学期 × 5教师 × 多班级，共 36 条） ============
// 数据故事：全校均分逐学期上升(0.83→0.85→0.87)；高二·三班互动性在2025秋下滑(异常)；体育刘洋规范性偏低(教研点)

interface SeedSessionDef {
  id: string;
  scenario: SessionRecord['scenario'];
  title: string;
  teacherId: string;
  teacherName: string;
  date: string;
  duration: number;
  metrics: SessionRecord['metrics'];
  studentCount: number;
  classId: string;
  gradeId: string;
  termId: string;
  subjectId: string;
  note?: string;
}

const SESSION_DEFS: SeedSessionDef[] = [
  // —— 2024秋 (term-2024-fall) 12节 ——
  { id: 'seed-c1', scenario: 'classroom', title: '高一物理·牛顿第一定律', teacherId: 't1', teacherName: '李建国', date: '2024-09-12', duration: 180, metrics: { teaching: 0.84, engagement: 0.80, interaction: 0.82, compliance: 0.90, innovation: 0.74 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2024-fall', subjectId: 'subj-physics' },
  { id: 'seed-c2', scenario: 'lab', title: '高一化学·粗盐提纯', teacherId: 't2', teacherName: '王芳', date: '2024-09-18', duration: 200, metrics: { teaching: 0.82, engagement: 0.85, interaction: 0.78, compliance: 0.92, innovation: 0.70 }, studentCount: 38, classId: 'class-1-2', gradeId: 'grade-1', termId: 'term-2024-fall', subjectId: 'subj-chemistry' },
  { id: 'seed-c3', scenario: 'classroom', title: '高二数学·数列求和', teacherId: 't3', teacherName: '张伟', date: '2024-09-25', duration: 180, metrics: { teaching: 0.86, engagement: 0.83, interaction: 0.84, compliance: 0.88, innovation: 0.82 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2024-fall', subjectId: 'subj-math' },
  { id: 'seed-c4', scenario: 'pe', title: '高二体育·篮球运球', teacherId: 't4', teacherName: '刘洋', date: '2024-10-09', duration: 150, metrics: { teaching: 0.80, engagement: 0.88, interaction: 0.80, compliance: 0.76, innovation: 0.72 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2024-fall', subjectId: 'subj-pe' },
  { id: 'seed-c5', scenario: 'workshop', title: '高三实训·车削加工基础', teacherId: 't5', teacherName: '陈静', date: '2024-10-16', duration: 220, metrics: { teaching: 0.85, engagement: 0.82, interaction: 0.76, compliance: 0.93, innovation: 0.68 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2024-fall', subjectId: 'subj-training' },
  { id: 'seed-c6', scenario: 'classroom', title: '高一物理·匀变速直线运动', teacherId: 't1', teacherName: '李建国', date: '2024-10-23', duration: 180, metrics: { teaching: 0.86, engagement: 0.82, interaction: 0.80, compliance: 0.91, innovation: 0.76 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2024-fall', subjectId: 'subj-physics' },
  { id: 'seed-c7', scenario: 'microlesson', title: '高二数学·函数单调性', teacherId: 't3', teacherName: '张伟', date: '2024-11-06', duration: 180, metrics: { teaching: 0.88, engagement: 0.84, interaction: 0.75, compliance: 0.90, innovation: 0.85 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2024-fall', subjectId: 'subj-math' },
  { id: 'seed-c8', scenario: 'lab', title: '高二物理·验证牛顿第二定律', teacherId: 't1', teacherName: '李建国', date: '2024-11-13', duration: 200, metrics: { teaching: 0.87, engagement: 0.86, interaction: 0.83, compliance: 0.94, innovation: 0.78 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2024-fall', subjectId: 'subj-physics' },
  { id: 'seed-c9', scenario: 'pe', title: '高一体育·田径短跑', teacherId: 't4', teacherName: '刘洋', date: '2024-11-20', duration: 150, metrics: { teaching: 0.78, engagement: 0.87, interaction: 0.78, compliance: 0.74, innovation: 0.70 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2024-fall', subjectId: 'subj-pe' },
  { id: 'seed-c10', scenario: 'classroom', title: '高三实训·数控编程入门', teacherId: 't5', teacherName: '陈静', date: '2024-12-04', duration: 180, metrics: { teaching: 0.84, engagement: 0.80, interaction: 0.77, compliance: 0.92, innovation: 0.72 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2024-fall', subjectId: 'subj-training' },
  { id: 'seed-c11', scenario: 'classroom', title: '高一化学·物质的量', teacherId: 't2', teacherName: '王芳', date: '2024-12-11', duration: 180, metrics: { teaching: 0.83, engagement: 0.81, interaction: 0.79, compliance: 0.89, innovation: 0.73 }, studentCount: 38, classId: 'class-1-2', gradeId: 'grade-1', termId: 'term-2024-fall', subjectId: 'subj-chemistry' },
  { id: 'seed-c12', scenario: 'classroom', title: '高二物理·平抛运动', teacherId: 't1', teacherName: '李建国', date: '2024-12-18', duration: 180, metrics: { teaching: 0.85, engagement: 0.83, interaction: 0.81, compliance: 0.92, innovation: 0.77 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2024-fall', subjectId: 'subj-physics' },

  // —— 2025春 (term-2025-spring) 13节 ——
  { id: 'seed-c13', scenario: 'classroom', title: '高一物理·牛顿第二定律', teacherId: 't1', teacherName: '李建国', date: '2025-03-05', duration: 180, metrics: { teaching: 0.87, engagement: 0.83, interaction: 0.84, compliance: 0.92, innovation: 0.78 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2025-spring', subjectId: 'subj-physics' },
  { id: 'seed-c14', scenario: 'lab', title: '高一化学·元素周期表', teacherId: 't2', teacherName: '王芳', date: '2025-03-12', duration: 200, metrics: { teaching: 0.84, engagement: 0.86, interaction: 0.81, compliance: 0.93, innovation: 0.74 }, studentCount: 38, classId: 'class-1-2', gradeId: 'grade-1', termId: 'term-2025-spring', subjectId: 'subj-chemistry' },
  { id: 'seed-c15', scenario: 'classroom', title: '高二数学·立体几何', teacherId: 't3', teacherName: '张伟', date: '2025-03-19', duration: 180, metrics: { teaching: 0.88, engagement: 0.85, interaction: 0.86, compliance: 0.89, innovation: 0.84 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-math' },
  { id: 'seed-c16', scenario: 'pe', title: '高二体育·足球传接', teacherId: 't4', teacherName: '刘洋', date: '2025-03-26', duration: 150, metrics: { teaching: 0.82, engagement: 0.89, interaction: 0.82, compliance: 0.78, innovation: 0.74 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-pe' },
  { id: 'seed-c17', scenario: 'workshop', title: '高三实训·钳工装配', teacherId: 't5', teacherName: '陈静', date: '2025-04-09', duration: 220, metrics: { teaching: 0.87, engagement: 0.84, interaction: 0.79, compliance: 0.94, innovation: 0.72 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2025-spring', subjectId: 'subj-training' },
  { id: 'seed-c18', scenario: 'classroom', title: '高一物理·万有引力', teacherId: 't1', teacherName: '李建国', date: '2025-04-16', duration: 180, metrics: { teaching: 0.88, engagement: 0.84, interaction: 0.83, compliance: 0.93, innovation: 0.80 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2025-spring', subjectId: 'subj-physics' },
  { id: 'seed-c19', scenario: 'lab', title: '高二化学·原电池', teacherId: 't2', teacherName: '王芳', date: '2025-04-23', duration: 200, metrics: { teaching: 0.85, engagement: 0.87, interaction: 0.82, compliance: 0.94, innovation: 0.76 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-chemistry' },
  { id: 'seed-c20', scenario: 'microlesson', title: '高二数学·导数概念', teacherId: 't3', teacherName: '张伟', date: '2025-05-07', duration: 180, metrics: { teaching: 0.90, engagement: 0.86, interaction: 0.78, compliance: 0.91, innovation: 0.87 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-math' },
  { id: 'seed-c21', scenario: 'classroom', title: '高二物理·圆周运动', teacherId: 't1', teacherName: '李建国', date: '2025-05-14', duration: 180, metrics: { teaching: 0.89, engagement: 0.85, interaction: 0.84, compliance: 0.94, innovation: 0.81 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-physics' },
  { id: 'seed-c22', scenario: 'pe', title: '高一体育·体操', teacherId: 't4', teacherName: '刘洋', date: '2025-05-21', duration: 150, metrics: { teaching: 0.81, engagement: 0.88, interaction: 0.80, compliance: 0.77, innovation: 0.73 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2025-spring', subjectId: 'subj-pe' },
  { id: 'seed-c23', scenario: 'workshop', title: '高三实训·焊接工艺', teacherId: 't5', teacherName: '陈静', date: '2025-06-04', duration: 220, metrics: { teaching: 0.86, engagement: 0.83, interaction: 0.80, compliance: 0.95, innovation: 0.74 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2025-spring', subjectId: 'subj-training' },
  { id: 'seed-c24', scenario: 'classroom', title: '高一化学·氧化还原反应', teacherId: 't2', teacherName: '王芳', date: '2025-06-11', duration: 180, metrics: { teaching: 0.85, engagement: 0.83, interaction: 0.82, compliance: 0.90, innovation: 0.76 }, studentCount: 38, classId: 'class-1-2', gradeId: 'grade-1', termId: 'term-2025-spring', subjectId: 'subj-chemistry' },
  { id: 'seed-c25', scenario: 'classroom', title: '高二物理·机械能守恒', teacherId: 't1', teacherName: '李建国', date: '2025-06-18', duration: 180, metrics: { teaching: 0.90, engagement: 0.86, interaction: 0.85, compliance: 0.95, innovation: 0.82 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-spring', subjectId: 'subj-physics' },

  // —— 2025秋 (term-2025-fall, 当前学期) 11节 ——
  { id: 'seed-c26', scenario: 'classroom', title: '高一物理·动能定理', teacherId: 't1', teacherName: '李建国', date: '2025-09-10', duration: 180, metrics: { teaching: 0.90, engagement: 0.86, interaction: 0.86, compliance: 0.94, innovation: 0.82 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2025-fall', subjectId: 'subj-physics' },
  { id: 'seed-c27', scenario: 'lab', title: '高一化学·酸碱中和滴定', teacherId: 't2', teacherName: '王芳', date: '2025-09-17', duration: 200, metrics: { teaching: 0.87, engagement: 0.88, interaction: 0.84, compliance: 0.95, innovation: 0.78 }, studentCount: 38, classId: 'class-1-2', gradeId: 'grade-1', termId: 'term-2025-fall', subjectId: 'subj-chemistry' },
  { id: 'seed-c28', scenario: 'classroom', title: '高二数学·圆锥曲线', teacherId: 't3', teacherName: '张伟', date: '2025-09-24', duration: 180, metrics: { teaching: 0.91, engagement: 0.87, interaction: 0.88, compliance: 0.90, innovation: 0.88 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2025-fall', subjectId: 'subj-math' },
  { id: 'seed-c29', scenario: 'pe', title: '高二体育·排球垫球', teacherId: 't4', teacherName: '刘洋', date: '2025-10-08', duration: 150, metrics: { teaching: 0.83, engagement: 0.90, interaction: 0.83, compliance: 0.79, innovation: 0.76 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-fall', subjectId: 'subj-pe' },
  { id: 'seed-c30', scenario: 'workshop', title: '高三实训·数控铣削', teacherId: 't5', teacherName: '陈静', date: '2025-10-15', duration: 220, metrics: { teaching: 0.88, engagement: 0.85, interaction: 0.82, compliance: 0.96, innovation: 0.76 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2025-fall', subjectId: 'subj-training' },
  { id: 'seed-c31', scenario: 'classroom', title: '高二物理·动量守恒', teacherId: 't1', teacherName: '李建国', date: '2025-10-22', duration: 180, metrics: { teaching: 0.91, engagement: 0.88, interaction: 0.87, compliance: 0.95, innovation: 0.84 }, studentCount: 42, classId: 'class-2-1', gradeId: 'grade-2', termId: 'term-2025-fall', subjectId: 'subj-physics' },
  { id: 'seed-c32', scenario: 'lab', title: '高二化学·电解池', teacherId: 't2', teacherName: '王芳', date: '2025-11-05', duration: 200, metrics: { teaching: 0.86, engagement: 0.87, interaction: 0.83, compliance: 0.94, innovation: 0.79 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-fall', subjectId: 'subj-chemistry' },
  { id: 'seed-c33', scenario: 'microlesson', title: '高三数学·概率统计', teacherId: 't3', teacherName: '张伟', date: '2025-11-12', duration: 180, metrics: { teaching: 0.92, engagement: 0.88, interaction: 0.80, compliance: 0.92, innovation: 0.89 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2025-fall', subjectId: 'subj-math' },
  { id: 'seed-c34', scenario: 'classroom', title: '高二物理·波的形成', teacherId: 't1', teacherName: '李建国', date: '2025-11-19', duration: 180, metrics: { teaching: 0.89, engagement: 0.80, interaction: 0.72, compliance: 0.93, innovation: 0.80 }, studentCount: 38, classId: 'class-2-3', gradeId: 'grade-2', termId: 'term-2025-fall', subjectId: 'subj-physics', note: '本节互动性明显下滑，需关注' },
  { id: 'seed-c35', scenario: 'pe', title: '高一体育·跳绳', teacherId: 't4', teacherName: '刘洋', date: '2025-11-26', duration: 150, metrics: { teaching: 0.84, engagement: 0.91, interaction: 0.84, compliance: 0.80, innovation: 0.77 }, studentCount: 40, classId: 'class-1-1', gradeId: 'grade-1', termId: 'term-2025-fall', subjectId: 'subj-pe' },
  { id: 'seed-c36', scenario: 'workshop', title: '高三实训·CAD制图', teacherId: 't5', teacherName: '陈静', date: '2025-12-03', duration: 180, metrics: { teaching: 0.89, engagement: 0.86, interaction: 0.83, compliance: 0.96, innovation: 0.78 }, studentCount: 36, classId: 'class-3-1', gradeId: 'grade-3', termId: 'term-2025-fall', subjectId: 'subj-training' },
];

export const seedSessions: SessionRecord[] = SESSION_DEFS.map((d) => ({ ...d }));

// 回填教师/学生的 sessionIds
for (const t of seedTeacherProfiles) {
  t.sessionIds = seedSessions.filter((s) => s.teacherId === t.id).map((s) => s.id);
}
seedStudentProfiles[0].sessionIds = seedSessions.filter((s) => s.classId === 'class-2-3').map((s) => s.id).slice(0, 8);
seedStudentProfiles[1].sessionIds = seedSessions.filter((s) => s.classId === 'class-2-3').map((s) => s.id).slice(0, 6);
seedStudentProfiles[2].sessionIds = seedSessions.filter((s) => s.classId === 'class-2-1').map((s) => s.id).slice(0, 8);

export const seedNotes: NoteRecord[] = [
  { id: 'seed-note-1', scenarioId: 'classroom', scenarioLabel: '🏫 物理·牛顿第二定律', t: 32, content: 'F=ma 公式：合外力 = 质量 × 加速度。加速度方向与合外力方向一致。', pinned: true, createdAt: Date.now() - 86400000 },
  { id: 'seed-note-2', scenarioId: 'lab', scenarioLabel: '🔬 化学·酸碱中和滴定', t: 75, content: '半滴操作：液滴悬于管口，靠瓶壁接入。保证精度<0.1%误差。', pinned: true, createdAt: Date.now() - 172800000 },
  { id: 'seed-note-3', scenarioId: 'microlesson', scenarioLabel: '🎥 数学·函数单调性', t: 105, content: 'ln(x) 求导 1/x，定义域 x>0 时恒正故递增。', pinned: false, createdAt: Date.now() - 259200000 },
];
