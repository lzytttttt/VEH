// 验证 CapabilityAdapter 的 sanitize 逻辑：残缺 LLM JSON 应被补默认值而非整包拒绝
import { CapabilityAdapter } from '../src/harness/adapters/CapabilityAdapter';

const adapter = new CapabilityAdapter() as unknown as {
  sanitizeWiki: (o: unknown) => unknown;
  sanitizeSimulation: (o: unknown) => unknown;
  sanitizeGames: (o: unknown) => unknown;
};

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${detail ?? ''}`); }
}

// ---- Wiki：完整字段 ----
const fullWiki = {
  nodes: [
    { id: 'n1', title: '牛顿第一定律', category: '力学', summary: '惯性定律', details: '物体保持静止或匀速直线运动...', related: ['n2'], classroomRefs: [{ t: 120, type: '板书', label: '书写 F=ma' }] },
    { id: 'n2', title: '加速度', category: '力学', summary: 'a=F/m', details: '加速度方向与合外力相同', related: ['n1'], classroomRefs: [] },
  ],
  assistantScript: [{ q: '加速度方向跟谁相同？', a: '与合外力方向相同', keywords: ['加速度'] }],
};
check('Wiki 完整字段通过', adapter.sanitizeWiki(fullWiki) !== null);

// ---- Wiki：残缺字段（缺 details/classroomRefs，id 缺失）----
const partialWiki = {
  nodes: [
    { title: '牛顿第一定律', category: '力学' },
    { id: 'n2', title: '加速度', summary: 'a=F/m', details: 123, related: 'n1', classroomRefs: [{ type: '板书' }] },
  ],
};
const w = adapter.sanitizeWiki(partialWiki) as { nodes: any[]; assistantScript: any[] } | null;
check('Wiki 残缺字段不降级', w !== null);
check('Wiki 缺 id 自动补 n1', w?.nodes[0].id === 'n1');
check('Wiki 缺 details 补空串', w?.nodes[0].details === '');
check('Wiki related 非数组补 []', Array.isArray(w?.nodes[1].related) && w!.nodes[1].related.length === 0);
check('Wiki classroomRefs 缺 t 补 0', w?.nodes[1].classroomRefs[0].t === 0);
check('Wiki assistantScript 缺失补 []', Array.isArray(w?.assistantScript) && w!.assistantScript.length === 0);

// ---- Wiki：nodes 空数组 → 降级 ----
check('Wiki 空 nodes 降级', adapter.sanitizeWiki({ nodes: [] }) === null);
check('Wiki 非对象降级', adapter.sanitizeWiki('oops') === null);

// ---- Simulation：完整 ----
const fullSim = {
  scenario: 'classroom', classroomTitle: '高一物理',
  students: [{ id: 's1', name: '张明', profile: '好问' }],
  branches: [{ id: 'b1', situation: '张明举手提问', options: [{ id: 'o1', label: '请他回答', feedback: '很好', score: 10 }] }],
};
check('Simulation 完整通过', adapter.sanitizeSimulation(fullSim) !== null);

// ---- Simulation：残缺（students 缺字段、options 缺 score）----
const partialSim = {
  scenario: 'classroom',
  students: [{ name: '李华' }],
  branches: [
    { situation: '李华走神', options: [{ label: '点名提醒' }] },
    { situation: '无学生名', options: [] },
  ],
};
const s = adapter.sanitizeSimulation(partialSim) as any | null;
check('Simulation 残缺不降级', s !== null);
check('Simulation 学生补 id/状态', s?.students[0].id === 's1' && s.students[0].state === 'attentive');
check('Simulation 选项补 score 0', s?.branches[0].options[0].score === 0);
check('Simulation 空选项分支被过滤', s?.branches.length === 1);

// ---- Simulation：branches 空 → 降级 ----
check('Simulation 空 branches 降级', adapter.sanitizeSimulation({ scenario: 'classroom', branches: [] }) === null);

// ---- Games：残缺 ----
const partialGames = [
  { title: '限时问答', type: 'choice', questions: [{ prompt: '1+1=?', options: ['2', '3'] }] },
  { id: 'g2', questions: [{ prompt: 'x' }] },
  { questions: [] },
];
const g = adapter.sanitizeGames(partialGames) as any[] | null;
check('Games 残缺不降级', g !== null && g.length === 2);
check('Games 缺 id 补 g1', g?.[0].id === 'g1');
check('Games 空题模块被过滤', g?.length === 2);
check('Games 空数组降级', adapter.sanitizeGames([]) === null);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
