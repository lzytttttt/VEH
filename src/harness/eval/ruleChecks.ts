import type { EvalDimension, EvalTarget, RuleResult } from './types';
import type { GameModule, WikiContainer, GovernanceChunk } from '../types';

const PASS_THRESHOLD = 7;

/** 规则检查总入口：按 target 分派到具体规则 */
export function ruleCheck(
  target: EvalTarget,
  content: unknown,
  ctx?: Record<string, unknown>,
): RuleResult {
  switch (target) {
    case 'lessonPlan':
      return checkLessonPlan(String(content ?? ''));
    case 'slides':
      return checkSlides(String(content ?? ''));
    case 'wiki':
      return checkWiki(content as WikiContainer);
    case 'game':
      return checkGame(content as GameModule[]);
    case 'governance':
      return checkGovernance(content as GovernanceChunk[] | string, ctx);
    default:
      return { score: 5, issues: ['未知评估对象'], dimensions: [] };
  }
}

/** 教案：缺必备标题 -2/项 */
function checkLessonPlan(md: string): RuleResult {
  const required = ['教学目标', '教学重难点', '教学过程', '板书设计'];
  const issues: string[] = [];
  const dims: EvalDimension[] = [];
  let score = 10;
  for (const h of required) {
    const present = new RegExp(`#+.*${h}`).test(md);
    if (!present) {
      score -= 2;
      issues.push(`缺失段落：${h}`);
    }
  }
  dims.push({ name: '结构完整性', score: Math.max(1, score), reason: issues.length ? issues.join('；') : '四段齐全' });
  // 字数检查
  const charCount = md.replace(/\s/g, '').length;
  if (charCount < 200) {
    score -= 1;
    issues.push(`内容过短（${charCount} 字 < 200）`);
  }
  dims.push({ name: '内容充实度', score: charCount >= 200 ? 9 : 5, reason: `${charCount} 字` });
  return finalize(score, issues, dims);
}

/** 课件：分页 <3 -3；某页字数 <20 或 >400 -1/页 */
function checkSlides(md: string): RuleResult {
  const pages = md.split(/\n---\n/).filter((p) => p.trim());
  const issues: string[] = [];
  const dims: EvalDimension[] = [];
  let score = 10;
  if (pages.length < 3) {
    score -= 3;
    issues.push(`分页不足（${pages.length} < 3）`);
  }
  let badPages = 0;
  pages.forEach((p, i) => {
    const len = p.replace(/\s/g, '').length;
    if (len < 20 || len > 400) {
      badPages++;
      issues.push(`第 ${i + 1} 页字数异常（${len}）`);
    }
  });
  score -= Math.min(badPages, 5);
  dims.push({ name: '分页规范', score: pages.length >= 3 ? 9 : 5, reason: `${pages.length} 页` });
  dims.push({ name: '内容密度', score: badPages === 0 ? 9 : Math.max(3, 9 - badPages), reason: `${badPages} 页异常` });
  return finalize(score, issues, dims);
}

/** Wiki：related 不闭环 -1/处；无 classroomRefs -2/节点 */
function checkWiki(wiki: unknown): RuleResult {
  const issues: string[] = [];
  const dims: EvalDimension[] = [];
  let score = 10;
  const w = wiki as Partial<WikiContainer> | undefined;
  const nodes = w?.nodes ?? [];
  if (nodes.length === 0) {
    return finalize(2, ['无知识节点'], [{ name: '节点数', score: 2, reason: '0 节点' }]);
  }
  // 闭环校验
  let unclosed = 0;
  const idSet = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    for (const r of n.related ?? []) {
      if (!idSet.has(r)) {
        unclosed++;
        issues.push(`节点 ${n.title} 引用了不存在的 ${r}`);
      } else {
        const target = nodes.find((x) => x.id === r);
        if (target && !(target.related ?? []).includes(n.id)) {
          unclosed++;
          issues.push(`关联不闭环：${n.title}→${target.title} 但反向缺失`);
        }
      }
    }
    if (!(n.classroomRefs ?? []).length) {
      score -= 2;
      issues.push(`节点 ${n.title} 无课堂引用`);
    }
  }
  score -= Math.min(unclosed, 5);
  dims.push({ name: '关联闭环', score: unclosed === 0 ? 9 : Math.max(3, 9 - unclosed), reason: `${unclosed} 处不闭环` });
  dims.push({ name: '课堂引用', score: nodes.every((n) => (n.classroomRefs ?? []).length > 0) ? 9 : 5, reason: `${nodes.filter((n) => (n.classroomRefs ?? []).length > 0).length}/${nodes.length} 有引用` });
  return finalize(score, issues, dims);
}

/** 题目：answer 为空 -3/题；类型单一 -2 */
function checkGame(games: unknown): RuleResult {
  const issues: string[] = [];
  const dims: EvalDimension[] = [];
  let score = 10;
  const arr = (games as GameModule[] | undefined) ?? [];
  const allQ = arr.flatMap((g) => g.questions ?? []);
  if (allQ.length === 0) {
    return finalize(2, ['无题目'], [{ name: '题量', score: 2, reason: '0 题' }]);
  }
  const emptyAns = allQ.filter((q) => q.answer === '' || q.answer == null || (Array.isArray(q.answer) && q.answer.length === 0));
  score -= Math.min(emptyAns.length * 3, 6);
  if (emptyAns.length) issues.push(`${emptyAns.length} 题答案为空`);
  const types = new Set(allQ.map((q) => q.type));
  if (types.size === 1) {
    score -= 2;
    issues.push(`题型单一（仅 ${[...types][0]}）`);
  }
  dims.push({ name: '答案完整性', score: emptyAns.length === 0 ? 9 : Math.max(3, 9 - emptyAns.length * 2), reason: `${allQ.length - emptyAns.length}/${allQ.length} 有答案` });
  dims.push({ name: '题型多样性', score: types.size >= 2 ? 9 : 5, reason: `${types.size} 种题型` });
  return finalize(score, issues, dims);
}

/** 治理简报：检查行数与数值引用（简化版 refId 对齐） */
function checkGovernance(content: unknown, ctx?: Record<string, unknown>): RuleResult {
  const issues: string[] = [];
  const dims: EvalDimension[] = [];
  let score = 10;
  const lines = Array.isArray(content)
    ? (content as GovernanceChunk[]).map((c) => c.content).filter(Boolean)
    : String(content ?? '').split('\n').filter(Boolean);
  if (lines.length < 3) {
    score -= 3;
    issues.push(`简报行数不足（${lines.length} < 3）`);
  }
  // 检查是否引用了数值
  const numRefs = lines.filter((l) => /\d+(\.\d+)?%?/.test(l)).length;
  if (numRefs < 2) {
    score -= 2;
    issues.push('数值引用不足（<2 处）');
  }
  // 若有 ctx.aggregates，做粗校验：简报中出现的"全校综合评分"数字是否接近真实值
  const agg = ctx?.aggregates as { schoolOverview?: { totalScore?: number } } | undefined;
  if (agg?.schoolOverview?.totalScore != null) {
    const real = agg.schoolOverview.totalScore;
    const cited = lines
      .map((l) => {
        const m = l.match(/综合评分[：:\s]*(\d+(\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
      })
      .find((v): v is number => v != null);
    if (cited != null && Math.abs(cited - real) > 0.5) {
      score -= 2;
      issues.push(`引用综合评分 ${cited} 与真实值 ${real.toFixed(2)} 不符`);
    }
  }
  dims.push({ name: '内容完整性', score: lines.length >= 3 ? 9 : 5, reason: `${lines.length} 条` });
  dims.push({ name: '数据引用', score: numRefs >= 2 ? 9 : 5, reason: `${numRefs} 处数值` });
  return finalize(score, issues, dims);
}

function finalize(score: number, issues: string[], dims: EvalDimension[]): RuleResult {
  const clamped = Math.max(1, Math.min(10, score));
  return { score: clamped, issues, dimensions: dims };
}

export { PASS_THRESHOLD };
