// 提取各功能实际输出，检查内容质量
(globalThis as any).localStorage = {
  _d: new Map<string, string>(),
  getItem(k: string) { return this._d.get(k) ?? null; },
  setItem(k: string, v: string) { this._d.set(k, v); },
  removeItem(k: string) { this._d.delete(k); },
};
(globalThis as any).window = { setTimeout, clearTimeout };

import { useApiConfigStore } from '../src/stores/apiConfigStore';
import { CapabilityAdapter } from '../src/harness/adapters/CapabilityAdapter';
import { LessonPlanAdapter } from '../src/harness/lessonPlan/adapter';
import { SlidesAdapter } from '../src/harness/slides/adapter';

const KEY = 'sk-3EAPKicpJwXePlyKrT5csut666H2zHVirlZ0m53KYF91GB7LsYWNDCAxhV0v7jMk';
const BASE = 'https://opencode.ai/zen/go/v1';
const MODEL = 'deepseek-v4-flash';

const store = useApiConfigStore.getState();
for (const k of ['capability', 'lessonPlan', 'slides'] as const) {
  store.setProvider(k, { active: 'api', baseURL: BASE, apiKey: KEY, model: MODEL });
}

async function collectStream(gen: AsyncIterable<any>): Promise<string> {
  let out = '';
  for await (const c of gen) out += c.content ?? '';
  return out;
}

(async () => {
  const cap = new CapabilityAdapter();

  console.log('========== 1. Wiki 节点标题 ==========');
  const wiki = await cap.getWiki('classroom');
  wiki.nodes.forEach((n, i) => console.log(`  ${i + 1}. [${n.category}] ${n.title}`));
  console.log(`  问答脚本: ${wiki.assistantScript.length} 条`);

  console.log('========== 2. 演练剧本 ==========');
  const sim = await cap.getSimulation('classroom');
  console.log(`  学生: ${sim.students.map((s) => s.name).join('、')}`);
  sim.branches.forEach((b, i) => console.log(`  情境${i + 1}: ${b.situation.slice(0, 40)} (${b.options.length} 选项)`));

  console.log('========== 3. 游戏模块 ==========');
  const games = await cap.getGames('classroom');
  games.forEach((g, i) => console.log(`  ${i + 1}. [${g.type}] ${g.title} (${g.questions.length} 题)`));

  console.log('========== 4. 教案草稿（前 500 字） ==========');
  const lp = new LessonPlanAdapter();
  const draft = await collectStream(lp.streamDraft({ topic: '函数单调性判定', subject: '数学', duration: 45 }));
  console.log(draft.slice(0, 500));

  console.log('\n========== 5. 课件草稿（前 500 字） ==========');
  const sl = new SlidesAdapter();
  const slides = await collectStream(sl.streamDraft({ topic: '牛顿第二定律', subject: '物理', design: 'dataviz', duration: 45 }));
  console.log(slides.slice(0, 500));
  console.log(`\n  分页数: ${slides.split('---').length - 1}`);

  process.exit(0);
})();
