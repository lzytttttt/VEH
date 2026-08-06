/**
 * 课件 Deck localStorage 持久化（独立 key，不侵入主 StorageSchema）
 * 解耦设计：课件工具自管数据，每张幻灯片为一段 markdown，用 `---` 分页
 */

export interface SlideDeckRecord {
  id: string;
  title: string;
  subject: string;
  topic: string;
  /** 幻灯片 markdown 数组，每元素为一张幻灯片 */
  slides: string[];
  /** 演讲者备注（与 slides 同索引） */
  notes: string[];
  createdAt: number;
  updatedAt: number;
}

const KEY = 'vlm-edu-hub:slide-decks';

interface StoreShape {
  version: 1;
  decks: SlideDeckRecord[];
}

function seedDeck(): SlideDeckRecord {
  return {
    id: 'sd-seed-1',
    title: '函数单调性判定 · 课件',
    subject: '数学',
    topic: '函数单调性判定',
    slides: [
      '# 函数单调性判定\n\n数学 · 高三微课',
      '## 学习目标\n\n1. 理解单调性定义\n2. 掌握导数判定法\n3. 求解单调区间',
      '## 单调性定义\n\n> 函数在区间内随自变量增大而函数值增大（递增）或减小（递减）。\n\n**严格定义**：对任意 x₁<x₂∈I，若 f(x₁)<f(x₂) 则递增。',
      "## 导数判定法\n\n若 f(x) 在区间内可导：\n\n- f'(x)>0 → **递增**\n- f'(x)<0 → **递减**",
      "## 例题：f(x)=x²-2x+3\n\n1. 求导：f'(x)=2x-2\n2. 令 f'(x)=0：x=1\n3. 划分区间",
      "## 单调区间\n\n| 区间 | f'(x) 符号 | 单调性 |\n|------|-----------|--------|\n| (-∞,1) | - | 递减 |\n| (1,+∞) | + | 递增 |",
      '## 课堂练习\n\n判断 f(x)=ln(x) 的单调性。\n\n> 思考 30 秒',
      '## 课堂小结\n\n- 单调性定义\n- 导数判定法\n- 区间划分四步',
      '## 作业\n\n1. P82 第 1-3 题\n2. 拓展：f(x)=x³\n\n下节课：函数极值与最值',
    ],
    notes: [
      '开场介绍本节微课主题，30 秒。',
      '强调三个学习目标，让学生明确预期。',
      '严格定义要板书，强调 x₁<x₂ 的任意性。',
      '导数判定法是核心，配合手势比划升降。',
      '例题分步推导，每步停顿确认学生跟上。',
      '表格清晰展示区间判号结果。',
      '练习环节观察学生反应，30 秒后揭晓答案。',
      '小结串联知识点，回扣目标。',
      '布置作业，预告下节课。',
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  };
}

function seed(): StoreShape {
  return { version: 1, decks: [seedDeck()] };
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
      console.error('SlideDecks persist failed', e);
    }
  }, 250);
}

function getStore(): StoreShape {
  if (cache) return cache;
  cache = load();
  return cache;
}

export function listSlideDecks(): SlideDeckRecord[] {
  return getStore().decks;
}

export function getSlideDeck(id: string): SlideDeckRecord | undefined {
  return getStore().decks.find((d) => d.id === id);
}

export function saveSlideDeck(deck: SlideDeckRecord): void {
  const store = getStore();
  const idx = store.decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) store.decks[idx] = { ...deck, updatedAt: Date.now() };
  else store.decks.push(deck);
  persist();
}

export function deleteSlideDeck(id: string): void {
  const store = getStore();
  store.decks = store.decks.filter((d) => d.id !== id);
  persist();
}

export function createSlideDeck(title = '新建课件'): SlideDeckRecord {
  const deck: SlideDeckRecord = {
    id: `sd-${Date.now()}`,
    title,
    subject: '数学',
    topic: title,
    slides: [`# ${title}\n\n新建幻灯片`],
    notes: [''],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  saveSlideDeck(deck);
  return deck;
}
