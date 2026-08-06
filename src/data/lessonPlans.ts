/**
 * 教案文档 localStorage 持久化（独立 key，不侵入主 StorageSchema）
 * 解耦设计：教案工具自管数据，避免迁移主库 schema
 */

export interface LessonPlanRecord {
  id: string;
  title: string;
  subject: string;
  topic: string;
  /** Markdown 正文 */
  content: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = 'vlm-edu-hub:lesson-plans';

interface StoreShape {
  version: 1;
  plans: LessonPlanRecord[];
}

function seed(): StoreShape {
  return {
    version: 1,
    plans: [
      {
        id: 'lp-seed-1',
        title: '函数单调性判定 · 教案',
        subject: '数学',
        topic: '函数单调性判定',
        content: [
          '# 函数单调性判定 · 教案',
          '',
          '> 学科：数学  ·  课时：45 分钟  ·  学段：高三',
          '',
          '## 一、教学目标',
          '1. 理解函数单调性的严格定义',
          '2. 掌握用导数判定单调性的方法',
          '3. 能求解常见函数的单调区间',
          '',
          '## 二、教学重难点',
          '- **重点**：导数判定法及步骤',
          '- **难点**：单调区间划分与驻点分析',
          '',
          '## 三、教学过程',
          '',
          '### 1. 情境导入（5 分钟）',
          '回顾函数图像随自变量增大的升降趋势，引出"单调性"概念。',
          '',
          '### 2. 新知讲解（20 分钟）',
          "**定义**：设 f(x) 在区间 I 上定义，对任意 x₁<x₂∈I，若 f(x₁)<f(x₂) 则递增。",
          '',
          "**判定法**：若 f(x) 在区间内可导，则 f'(x)>0 递增，f'(x)<0 递减。",
          '',
          '### 3. 例题精讲（12 分钟）',
          '**例 1**：f(x)=x²-2x+3，求单调区间。',
          "1. 求导 f'(x)=2x-2",
          "2. 令 f'(x)=0 得 x=1",
          '3. 划分区间 (-∞,1) 与 (1,+∞)',
          '',
          '### 4. 课堂练习（5 分钟）',
          '判断 f(x)=ln(x) 的单调性。',
          '',
          '### 5. 课堂小结（3 分钟）',
          '- 单调性定义',
          '- 导数判定法',
          '- 区间划分四步',
          '',
          '## 四、作业',
          '1. 教材 P82 第 1-3 题',
          '2. 拓展：判断 f(x)=x³ 的单调性',
          '',
          '---',
          '',
          '> 备注：下节课讲解函数极值与最值，请预习。',
        ].join('\n'),
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 3600000,
      },
    ],
  };
}

function load(): StoreShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.version || parsed.version !== 1) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return parsed;
  } catch {
    return seed();
  }
}

let cache: StoreShape | null = null;
let writeTimer: number | null = null;

function persist() {
  if (writeTimer != null) clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    writeTimer = null;
    if (!cache) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {
      console.error('LessonPlans persist failed', e);
    }
  }, 250);
}

function getStore(): StoreShape {
  if (cache) return cache;
  cache = load();
  return cache;
}

export function listLessonPlans(): LessonPlanRecord[] {
  return getStore().plans;
}

export function getLessonPlan(id: string): LessonPlanRecord | undefined {
  return getStore().plans.find((p) => p.id === id);
}

export function saveLessonPlan(plan: LessonPlanRecord): void {
  const store = getStore();
  const idx = store.plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) store.plans[idx] = { ...plan, updatedAt: Date.now() };
  else store.plans.push(plan);
  persist();
}

export function deleteLessonPlan(id: string): void {
  const store = getStore();
  store.plans = store.plans.filter((p) => p.id !== id);
  persist();
}

export function createLessonPlan(title = '新建教案'): LessonPlanRecord {
  const plan: LessonPlanRecord = {
    id: `lp-${Date.now()}`,
    title,
    subject: '数学',
    topic: title,
    content: `# ${title}\n\n`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveLessonPlan(plan);
  return plan;
}
