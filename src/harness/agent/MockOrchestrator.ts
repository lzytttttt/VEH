import type { AgentEvent, AgentOrchestrator, AgentTask, ToolRegistry } from './types';
import { sleep } from './types';
import type { ScenarioType } from '../types';

const SCENARIOS = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'] as const;

/** 预制任务：goal 关键词 → 固定步骤链 */
interface CannedTask {
  match: string[];
  planLabel: string;
  steps: { tool: string; args: (scenario: ScenarioType) => Record<string, unknown> }[];
  reflect: string;
  doneSummary: string;
}

const CANNED_TASKS: CannedTask[] = [
  {
    match: ['整理知识点', '出复习题', '整理这节课', '出题'],
    planLabel: '查课堂分析 → 抽知识节点 → 建Wiki → 派生题目',
    steps: [
      { tool: 'analyzeClassroom', args: (s) => ({ scenario: s }) },
      { tool: 'getWiki', args: (s) => ({ scenario: s }) },
      { tool: 'getGames', args: (s) => ({ scenario: s }) },
    ],
    reflect: 'Wiki 节点结构完整，题目覆盖 choice/match/connect 多题型，难度分布合理。',
    doneSummary: '知识整理 + 复习题已就绪，可在 Wiki / 学生闯关应用查看。',
  },
  {
    match: ['生成教案', '写教案', '备课'],
    planLabel: '查课堂 → 生成教案',
    steps: [
      { tool: 'analyzeClassroom', args: (s) => ({ scenario: s }) },
      { tool: 'generateLessonPlan', args: (s) => ({ topic: getTopic(s), scenario: s }) },
    ],
    reflect: '教案含教学目标 / 重难点 / 教学过程 / 板书设计四段，结构完整。',
    doneSummary: '教案已生成，可在教案工具中查看与微调。',
  },
  {
    match: ['分析课堂', '这堂课怎么样', '课堂分析'],
    planLabel: '调 VLM 分析课堂',
    steps: [{ tool: 'analyzeClassroom', args: (s) => ({ scenario: s }) }],
    reflect: '已产出事件流与 5 项指标，覆盖率 100%。',
    doneSummary: '课堂分析完成，可在分析报告应用查看详情。',
  },
  {
    match: ['出演练剧本', '虚拟学生', '演练'],
    planLabel: '查课堂 → 派生演练剧本',
    steps: [
      { tool: 'analyzeClassroom', args: (s) => ({ scenario: s }) },
      { tool: 'getSimulation', args: (s) => ({ scenario: s }) },
    ],
    reflect: '3 名学生 + 3 个情境分支就绪，可进入教师演练。',
    doneSummary: '演练剧本已生成，可在教师演练应用查看。',
  },
];

function getTopic(s: ScenarioType): string {
  const titles: Record<ScenarioType, string> = {
    classroom: '牛顿第二定律',
    pe: '篮球运球',
    lab: '酸碱中和滴定',
    workshop: '普通车削',
    microlesson: '函数单调性',
  };
  return titles[s];
}

function pickScenario(task: AgentTask): ScenarioType {
  const s = task.context?.scenario;
  return typeof s === 'string' && (SCENARIOS as readonly string[]).includes(s)
    ? (s as ScenarioType)
    : 'classroom';
}

function matchTask(goal: string): CannedTask | null {
  const g = goal.toLowerCase();
  for (const t of CANNED_TASKS) {
    if (t.match.some((kw) => g.includes(kw.toLowerCase()))) return t;
  }
  return null;
}

/** 按目标词频选最相关工具（降级单步直通） */
function pickFallbackTool(goal: string): string {
  const g = goal.toLowerCase();
  if (g.includes('教案') || g.includes('备课')) return 'generateLessonPlan';
  if (g.includes('课件') || g.includes('ppt') || g.includes('slides')) return 'generateSlides';
  if (g.includes('题') || g.includes('闯关')) return 'getGames';
  if (g.includes('演练') || g.includes('模拟')) return 'getSimulation';
  if (g.includes('治理') || g.includes('简报') || g.includes('校长')) return 'governanceInsight';
  if (g.includes('wiki') || g.includes('知识')) return 'getWiki';
  return 'analyzeClassroom';
}

/**
 * Mock Agent Orchestrator — 离线演示用
 *
 * 按 goal 关键词匹配预制剧本，按时序 yield 事件（plan 400ms → tool_call 200ms →
 * tool_result 600ms → reflect 500ms → done 200ms），工具结果调用真实 Mock Provider
 * （通过 ToolRegistry），保证演示数据与真实 Mock 一致、不重复造数据。
 * 未命中关键词 → 单步直通降级，保证任何输入都有响应。
 */
export class MockOrchestrator implements AgentOrchestrator {
  readonly name = 'MockAgentOrchestrator (Scripted)';

  constructor(private readonly registry: ToolRegistry) {}

  async *run(task: AgentTask): AsyncIterable<AgentEvent> {
    const controller = new AbortController();
    const scenario = pickScenario(task);
    const canned = matchTask(task.goal);

    try {
      if (!canned) {
        // 降级单步直通
        const toolName = pickFallbackTool(task.goal);
        yield { type: 'plan', content: `单步执行：调用 ${toolName}`, stepIndex: 1, degraded: true };
        await sleep(200, controller.signal);
        yield { type: 'tool_call', toolName, toolArgs: { scenario }, stepIndex: 1, degraded: true };
        await sleep(200, controller.signal);
        const result = await this.execTool(toolName, { scenario }, controller.signal);
        yield { type: 'tool_result', toolName, toolResult: result, stepIndex: 1, degraded: true };
        await sleep(300, controller.signal);
        yield { type: 'text', content: `已完成（Mock）：${this.summarize(toolName, result)}`, stepIndex: 1 };
        yield { type: 'done', stepIndex: 1 };
        return;
      }

      // 预制剧本走查
      yield { type: 'plan', content: `拆解为 ${canned.steps.length} 步：${canned.planLabel}`, stepIndex: 0 };
      await sleep(400, controller.signal);

      for (let i = 0; i < canned.steps.length; i++) {
        const step = canned.steps[i];
        const args = step.args(scenario);
        const stepIndex = i + 1;
        yield { type: 'tool_call', toolName: step.tool, toolArgs: args, stepIndex };
        await sleep(200, controller.signal);
        const result = await this.execTool(step.tool, args, controller.signal);
        yield { type: 'tool_result', toolName: step.tool, toolResult: result, stepIndex, elapsedMs: 600 };
        await sleep(600, controller.signal);
      }

      yield { type: 'text', content: `反思：${canned.reflect}`, stepIndex: canned.steps.length + 1 };
      await sleep(500, controller.signal);
      yield { type: 'done', content: `✅ ${canned.doneSummary}`, stepIndex: canned.steps.length + 1 };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        yield { type: 'error', error: '已取消' };
      } else {
        yield { type: 'error', error: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  private async execTool(
    name: string,
    args: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<unknown> {
    const tool = this.registry.get(name);
    if (!tool) return { error: `未知工具：${name}` };
    try {
      return await tool.execute(args, signal);
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  private summarize(toolName: string, result: unknown): string {
    if (!result || typeof result !== 'object') return '完成';
    const r = result as Record<string, unknown>;
    if (typeof r.nodeCount === 'number') return `Wiki ${r.nodeCount} 节点`;
    if (typeof r.totalQuestions === 'number') return `${r.totalQuestions} 道题`;
    if (typeof r.studentCount === 'number') return `${r.studentCount} 名学生演练`;
    if (typeof r.slideCount === 'number') return `${r.slideCount} 页课件`;
    if (typeof r.charCount === 'number') return `教案 ${r.charCount} 字`;
    if (typeof r.eventCount === 'number') return `${r.eventCount} 条事件`;
    return '完成';
  }

  cancel(): void {
    // Mock 依靠 sleep 的 AbortSignal 中断，无需额外实现
  }
}
