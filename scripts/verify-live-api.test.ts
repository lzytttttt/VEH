// 综合实测：用真实 key 跑 VEH 非 VLM 的 5 个 LLM 功能（走项目 adapter 代码）
// Node 环境 shim：apiConfigStore 依赖浏览器 localStorage/window
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
import { GovernanceAdapter } from '../src/harness/adapters/GovernanceAdapter';
import { PortalAdapter } from '../src/harness/adapters/PortalAdapter';
import type { GovernanceContext, PortalContext } from '../src/harness/types';

const KEY = 'sk-3EAPKicpJwXePlyKrT5csut666H2zHVirlZ0m53KYF91GB7LsYWNDCAxhV0v7jMk';
const BASE = 'https://opencode.ai/zen/go/v1';
const MODEL = 'deepseek-v4-flash';

// 配置 5 个 Provider
const store = useApiConfigStore.getState();
for (const k of ['capability', 'governance', 'portal', 'lessonPlan', 'slides'] as const) {
  store.setProvider(k, { active: 'api', baseURL: BASE, apiKey: KEY, model: MODEL });
}

let pass = 0, fail = 0;
function report(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${detail}`.slice(0, 400)); }
}

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error(`超时 ${ms / 1000}s`)), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

async function collectStream(gen: AsyncIterable<any>): Promise<string> {
  let out = '';
  for await (const c of gen) out += c.content ?? '';
  return out;
}

(async () => {
  const cap = new CapabilityAdapter();

  // 1. Wiki
  try {
    const wiki = await timeout(cap.getWiki('classroom'), 90_000);
    report('Capability.getWiki(classroom)', !!wiki && wiki.nodes.length > 0,
      `nodes=${wiki?.nodes.length}, scripts=${wiki?.assistantScript.length}, 首节点=${wiki?.nodes[0]?.title}`);
  } catch (e) { report('Capability.getWiki', false, String(e)); }

  // 2. 演练
  try {
    const sim = await timeout(cap.getSimulation('classroom'), 90_000);
    report('Capability.getSimulation(classroom)', !!sim && sim.branches.length > 0,
      `students=${sim?.students.length}, branches=${sim?.branches.length}, 首情境=${sim?.branches[0]?.situation?.slice(0, 30)}`);
  } catch (e) { report('Capability.getSimulation', false, String(e)); }

  // 3. 游戏
  try {
    const games = await timeout(cap.getGames('classroom'), 90_000);
    report('Capability.getGames(classroom)', !!games && games.length > 0,
      `模块=${games?.length}, 首模块=${games?.[0]?.title}`);
  } catch (e) { report('Capability.getGames', false, String(e)); }

  // 4. 教案
  try {
    const lp = new LessonPlanAdapter();
    const draft = await timeout(collectStream(lp.streamDraft({ topic: '函数单调性判定', subject: '数学', duration: 45 })), 120_000);
    report('LessonPlan.streamDraft', draft.length > 100, `长度=${draft.length}, 片段=${draft.slice(0, 60).replace(/\n/g, '⏎')}`);
  } catch (e) { report('LessonPlan.streamDraft', false, String(e)); }

  // 5. 课件
  try {
    const sl = new SlidesAdapter();
    const draft = await timeout(collectStream(sl.streamDraft({ topic: '牛顿第二定律', subject: '物理', design: 'dataviz', duration: 45 })), 120_000);
    report('Slides.streamDraft', draft.includes('---'), `长度=${draft.length}, 分页数=${draft.split('---').length - 1}`);
  } catch (e) { report('Slides.streamDraft', false, String(e)); }

  // 6. 治理简报
  try {
    const gov = new GovernanceAdapter();
    const ctx: GovernanceContext = {
      raw: { sessions: [], teachers: [], org: { schools: [], terms: [], grades: [], classes: [], subjects: [] } },
      aggregates: {
        schoolOverview: { totalScore: 86.2, scoreChange: 1.6, analyzedSessions: 13, totalSessions: 20, coverageRate: 0.65, activeTeachers: 5, activeClasses: 3 },
        classComparison: [{ classId: 'c1', className: '高一·三班', avgScore: 84.5, sessionCount: 4, studentCount: 45, trend: -2.1 }],
        subjectComparison: [{ subjectId: 's1', subjectName: '物理', avgScore: 87.3, teacherCount: 2, sessionCount: 5 }],
        teacherComparison: [{ teacherId: 't1', teacherName: '李建国', subject: '物理', avgScore: 88.1, sessionCount: 6, metrics: { teaching: 89, engagement: 79, interaction: 79, compliance: 93, innovation: 77 } }],
        trends: [{ termId: 'tr1', termName: '2026春', avgScore: 84.6, sessionCount: 10 }],
      },
    };
    const brief = await timeout(collectStream(gov.streamBriefing(ctx)), 90_000);
    report('Governance.streamBriefing', brief.length > 50, `长度=${brief.length}, 片段=${brief.slice(0, 60).replace(/\n/g, '⏎')}`);
  } catch (e) { report('Governance.streamBriefing', false, String(e)); }

  // 7. 门户导航
  try {
    const portal = new PortalAdapter();
    const pctx: PortalContext = {
      role: 'teacher',
      apps: [{ id: 'wiki', name: '知识WIKI', icon: '📖', category: 'ability', description: '知识图谱' }],
      summary: { cards: [{ label: '分析次数', value: '13' }], highlights: ['本学期已分析 13 节课'] },
    };
    const nav = await timeout(collectStream(portal.streamNavigate('我想看知识WIKI', pctx)), 90_000);
    report('Portal.streamNavigate', nav.length > 10, `长度=${nav.length}, 片段=${nav.slice(0, 60).replace(/\n/g, '⏎')}`);
  } catch (e) { report('Portal.streamNavigate', false, String(e)); }

  console.log(`\n===== 结果: ${pass} 通过, ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
})();
