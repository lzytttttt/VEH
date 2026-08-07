import type {
  CapabilityProvider,
  GameModule,
  ScenarioType,
  SimulationScript,
  WikiContainer,
} from '../types';
import { getProviderConfig } from '../../stores/apiConfigStore';
import { MockCapabilityProvider } from '../MockCapabilityProvider';
import { chatCompletionJSON } from './sseUtils';

/**
 * Capability API Adapter
 *
 * 设计：
 * - getWiki / getSimulation / getGames：**真实 LLM JSON 调用 + Mock 降级**
 *
 * 工作流：
 * 1. 构造针对场景的 prompt（subject/topic/学情），要求输出严格 JSON
 * 2. 走 chatCompletionJSON：先试 response_format=json_object，失败回退裸请求
 * 3. 多策略 JSON 抽取（直接 parse / ```json 代码块 / 首个 {...} 子串）
 * 4. 解析成功 + schema 校验通过 → 返回 LLM 内容
 * 5. 解析失败 / LLM 调用失败 → 静默降级 Mock（保持 UI 可用，避免空闪烁）
 *
 * 配置从 apiConfigStore 的 'capability' 条目懒读取（调用时取最新），
 * 切换 active='api' 后业务代码一行不改（与 MockCapabilityProvider 接口一致）。
 */
export class CapabilityAdapter implements CapabilityProvider {
  readonly name = 'Capability API Adapter';
  private mock = new MockCapabilityProvider();
  private wikiCache = new Map<ScenarioType, WikiContainer>();
  private simulationCache = new Map<ScenarioType, SimulationScript>();
  private gamesCache = new Map<ScenarioType, GameModule[]>();

  private cfg() {
    const c = getProviderConfig('capability');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'deepseek-v4-flash',
    };
  }

  /** 校验 WikiContainer 完整结构：每个节点所有必需字段 + 类型完整，缺一字段即弃用回退 Mock */
  private validateWiki(obj: unknown): obj is WikiContainer {
    if (!obj || typeof obj !== 'object') return false;
    const w = obj as Partial<WikiContainer>;
    if (!Array.isArray(w.nodes)) return false;
    if (!Array.isArray(w.assistantScript)) return false;
    if (w.nodes.length === 0) return false;

    const nodesValid = w.nodes.every(
      (n) =>
        n &&
        typeof n.id === 'string' &&
        typeof n.title === 'string' &&
        typeof n.category === 'string' &&
        typeof n.summary === 'string' &&
        typeof n.details === 'string' &&
        Array.isArray(n.related) &&
        n.related.every((r: unknown) => typeof r === 'string') &&
        Array.isArray(n.classroomRefs) &&
        n.classroomRefs.every(
          (cr: unknown) =>
            cr &&
            typeof cr === 'object' &&
            typeof (cr as { t: unknown }).t === 'number' &&
            typeof (cr as { type: unknown }).type === 'string' &&
            typeof (cr as { label: unknown }).label === 'string',
        ),
    );

    const scriptsValid = w.assistantScript.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as { q: unknown }).q === 'string' &&
        typeof (s as { a: unknown }).a === 'string' &&
        ((s as { keywords: unknown }).keywords === undefined ||
          Array.isArray((s as { keywords: unknown }).keywords)),
    );

    return nodesValid && scriptsValid;
  }

  private validateSimulation(obj: unknown): obj is SimulationScript {
    if (!obj || typeof obj !== 'object') return false;
    const s = obj as Partial<SimulationScript>;

    // 顶层结构
    if (typeof s.scenario !== 'string') return false;
    if (typeof s.classroomTitle !== 'string') return false;

    // students 必须为数组且每项含字符串 id/name
    if (!Array.isArray(s.students)) return false;
    const studentsValid = s.students.every(
      (st) =>
        st &&
        typeof st === 'object' &&
        typeof (st as { id: unknown }).id === 'string' &&
        typeof (st as { name: unknown }).name === 'string',
    );
    if (!studentsValid) return false;

    // branches 必须为数组，每个 branch 必须含 situation 字符串 + options 数组
    // DrillController 依赖 branch.situation.includes(s.name) 与 branch.options[].id/label/feedback/score
    if (!Array.isArray(s.branches)) return false;
    const branchesValid = s.branches.every(
      (b) => {
        if (!b || typeof b !== 'object') return false;
        const branch = b as { situation?: unknown; options?: unknown };
        if (typeof branch.situation !== 'string') return false;
        if (!Array.isArray(branch.options) || branch.options.length === 0) return false;
        return branch.options.every(
          (o) =>
            o &&
            typeof o === 'object' &&
            typeof (o as { id: unknown }).id === 'string' &&
            typeof (o as { label: unknown }).label === 'string' &&
            typeof (o as { feedback: unknown }).feedback === 'string' &&
            typeof (o as { score: unknown }).score === 'number',
        );
      },
    );
    if (!branchesValid) return false;

    return s.branches.length > 0;
  }

  private validateGames(obj: unknown): obj is GameModule[] {
    if (!Array.isArray(obj)) return false;
    if (obj.length === 0) return false;
    return obj.every(
      (g) =>
        g &&
        typeof g.id === 'string' &&
        typeof g.title === 'string' &&
        typeof (g as { type: unknown }).type === 'string' &&
        Array.isArray(g.questions) &&
        g.questions.length > 0 &&
        g.questions.every(
          (q: unknown) =>
            q &&
            typeof q === 'object' &&
            typeof (q as { id: unknown }).id === 'string' &&
            typeof (q as { type: unknown }).type === 'string' &&
            typeof (q as { prompt: unknown }).prompt === 'string' &&
            Array.isArray((q as { options: unknown }).options),
        ),
    );
  }

  /**
   * 宽松解析 WikiContainer：LLM 输出字段有缺失/类型不对时用默认值补齐，
   * 而不是整包拒绝降级 Mock。仅当 nodes 完全缺失或为空数组时返回 null（由调用方降级）。
   */
  private sanitizeWiki(obj: unknown): WikiContainer | null {
    if (!obj || typeof obj !== 'object') return null;
    const w = obj as Partial<WikiContainer>;
    if (!Array.isArray(w.nodes) || w.nodes.length === 0) return null;

    const nodes: WikiContainer['nodes'] = w.nodes.map((n, i) => {
      const raw = (n ?? {}) as Partial<WikiContainer['nodes'][number]>;
      const refs = Array.isArray(raw.classroomRefs)
        ? raw.classroomRefs
            .filter((r): r is { t: number; type: string; label: string } => !!r && typeof r === 'object')
            .map((r) => ({
              t: typeof r.t === 'number' ? r.t : 0,
              type: typeof r.type === 'string' ? r.type : '课堂片段',
              label: typeof r.label === 'string' ? r.label : '',
            }))
        : [];
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : `n${i + 1}`,
        title: typeof raw.title === 'string' && raw.title ? raw.title : `知识点 ${i + 1}`,
        category: typeof raw.category === 'string' && raw.category ? raw.category : '未分类',
        summary: typeof raw.summary === 'string' ? raw.summary : '',
        details: typeof raw.details === 'string' ? raw.details : '',
        related: Array.isArray(raw.related) ? raw.related.filter((r): r is string => typeof r === 'string') : [],
        classroomRefs: refs,
      };
    });

    const assistantScript: WikiContainer['assistantScript'] = Array.isArray(w.assistantScript)
      ? w.assistantScript
          .filter((s): s is { q: string; a: string; keywords?: string[] } => !!s && typeof s === 'object')
          .map((s) => ({
            q: typeof s.q === 'string' ? s.q : '',
            a: typeof s.a === 'string' ? s.a : '',
            keywords: Array.isArray(s.keywords) ? s.keywords.filter((k): k is string => typeof k === 'string') : undefined,
          }))
          .filter((s) => s.q && s.a)
      : [];

    return { nodes, assistantScript };
  }

  /** 宽松解析 SimulationScript：缺字段补默认值，仅 branches 为空才降级 */
  private sanitizeSimulation(obj: unknown): SimulationScript | null {
    if (!obj || typeof obj !== 'object') return null;
    const s = obj as Partial<SimulationScript>;
    if (!Array.isArray(s.branches) || s.branches.length === 0) return null;

    const students: SimulationScript['students'] = Array.isArray(s.students)
      ? (s.students as unknown[])
          .filter((st): st is object => !!st && typeof st === 'object')
          .map((st, i) => {
            const raw = st as Record<string, unknown>;
            return {
              id: typeof raw.id === 'string' && raw.id ? raw.id : `s${i + 1}`,
              name: typeof raw.name === 'string' && raw.name ? raw.name : `学生 ${i + 1}`,
              avatarColor: '#c0c0c0',
              triggerT: 0,
              state: 'attentive' as const,
              prompt: '',
            };
          })
      : [];

    const branches: SimulationScript['branches'] = Array.isArray(s.branches)
      ? (s.branches as unknown[])
          .filter((b): b is object => !!b && typeof b === 'object')
          .map((b, i) => {
            const raw = b as Record<string, unknown>;
            const options = Array.isArray(raw.options)
              ? (raw.options as unknown[])
                  .filter((o): o is object => !!o && typeof o === 'object')
                  .map((o, j) => {
                    const oraw = o as Record<string, unknown>;
                    return {
                      id: typeof oraw.id === 'string' && oraw.id ? oraw.id : `o${i}-${j}`,
                      label: typeof oraw.label === 'string' ? oraw.label : `选项 ${j + 1}`,
                      feedback: typeof oraw.feedback === 'string' ? oraw.feedback : '',
                      score: typeof oraw.score === 'number' ? oraw.score : 0,
                    };
                  })
              : [];
            return {
              id: `b${i + 1}`,
              situation: typeof raw.situation === 'string' && raw.situation ? raw.situation : `情境 ${i + 1}`,
              options,
            };
          })
          .filter((b) => b.options.length > 0)
      : [];

    if (branches.length === 0) return null;

    return {
      scenario: typeof s.scenario === 'string' ? (s.scenario as SimulationScript['scenario']) : 'classroom',
      classroomTitle: typeof s.classroomTitle === 'string' && s.classroomTitle ? s.classroomTitle : '虚拟课堂',
      students,
      branches,
    };
  }

  /** 宽松解析 GameModule[]：仅空数组才降级 */
  private sanitizeGames(obj: unknown): GameModule[] | null {
    if (!Array.isArray(obj) || obj.length === 0) return null;
    const games: GameModule[] = [];
    for (const g of obj) {
      if (!g || typeof g !== 'object') continue;
      const raw = g as Record<string, unknown>;
      const questions: GameModule['questions'] = Array.isArray(raw.questions)
        ? (raw.questions as unknown[])
            .filter((q): q is object => !!q && typeof q === 'object')
            .map((q, i) => {
              const qraw = q as Record<string, unknown>;
              const type = (['choice', 'match', 'connect'].includes(String(qraw.type)) ? String(qraw.type) : 'choice') as GameModule['type'];
              return {
                id: typeof qraw.id === 'string' && qraw.id ? qraw.id : `q${games.length}-${i}`,
                type,
                prompt: typeof qraw.prompt === 'string' && qraw.prompt ? qraw.prompt : `题目 ${i + 1}`,
                options: Array.isArray(qraw.options) ? qraw.options.filter((o): o is string => typeof o === 'string') : [],
                answer: '',
                wikiNodeId: '',
                explain: undefined,
                pairs: undefined,
              };
            })
        : [];
      if (questions.length === 0) continue;
      const type = (['choice', 'match', 'connect'].includes(String(raw.type)) ? String(raw.type) : 'choice') as GameModule['type'];
      games.push({
        id: typeof raw.id === 'string' && raw.id ? raw.id : `g${games.length + 1}`,
        title: typeof raw.title === 'string' && raw.title ? raw.title : `游戏 ${games.length + 1}`,
        type,
        questions,
      });
    }
    return games.length > 0 ? games : null;
  }

  async getWiki(scenario: ScenarioType): Promise<WikiContainer> {
    // 缓存命中（同一会话内同场景不重复调用）
    const cached = this.wikiCache.get(scenario);
    if (cached) return cached;

    try {
      const { baseURL, apiKey, model } = this.cfg();
      const wiki = await chatCompletionJSON<unknown>({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是教学知识图谱专家。基于课堂场景，输出符合下列结构的 JSON（不要再有其它文字）。

场景："${scenario}"（classroom=高中物理教室 / pe=体育课 / lab=化学实验 / workshop=实训车间 / microlesson=微课）。

JSON Schema：
{
  "nodes": [
    {
      "id": "string 唯一 id 如 n1",
      "title": "string 知识点标题",
      "category": "string 分类",
      "summary": "string 一句话摘要",
      "details": "string 3-6 段详细讲解",
      "related": ["string 关联节点 id"],
      "classroomRefs": [{"t": 秒数数字, "type": "事件类型", "label": "课堂引用片段"}]
    }
  ],
  "assistantScript": [
    { "q": "string 学生常见提问", "a": "string 回答", "keywords": ["可选关键词"] }
  ]
}

要求：
- 输出 4-7 个 nodes，按学科层级组织（力学/电磁学/...）
- 节点间相关关系通过 related 字段表达
- classroomRefs 用课堂情景引用每个节点
- assistantScript 至少 3 个常见问答
- 直接输出 JSON 对象`,
          },
          {
            role: 'user',
            content: `为场景 "${scenario}" 生成知识 WIKI 容器`,
          },
        ],
      });
      const parsed = this.sanitizeWiki(wiki);
      if (parsed) {
        this.wikiCache.set(scenario, parsed);
        return parsed;
      }
      console.warn('CapabilityAdapter.getWiki LLM JSON invalid, fallback to Mock', { scenario });
    } catch (e) {
      console.warn('CapabilityAdapter.getWiki LLM failed, fallback to Mock', e);
    }
    const mockWiki = await this.mock.getWiki(scenario);
    this.wikiCache.set(scenario, mockWiki);
    return mockWiki;
  }

  async getSimulation(scenario: ScenarioType): Promise<SimulationScript> {
    const cached = this.simulationCache.get(scenario);
    if (cached) return cached;

    try {
      const { baseURL, apiKey, model } = this.cfg();
      const sim = await chatCompletionJSON<SimulationScript>({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是教学演练剧本作家。基于课堂场景，输出符合下列 JSON 结构的虚拟学生演练剧本（不要再有其它文字）。

场景："${scenario}"

JSON Schema：
{
  "scenario": "string 与输入场景一致",
  "classroomTitle": "string 课堂标题",
  "students": [
    {
      "id": "string 学生 id",
      "name": "string 学生名",
      "profile": "string 性格/学情简述",
      "events": [{"t": 秒数, "type": "string 事件类型如 ask/disrupt/confused", "label": "事件描述"}]
    }
  ],
  "branches": [
    {
      "id": "string 分支 id",
      "trigger": "string 触发事件描述",
      "options": [
        { "id": "string", "label": "string 教师应对选项", "feedback": "string 反馈", "score": 0-100 数字 }
      ]
    }
  ]
}

要求：
- 至少 3 个 students、3 个 branches
- 每个 branch 给 2-3 个教师应对选项
- 直接输出 JSON 对象`,
          },
          {
            role: 'user',
            content: `为场景 "${scenario}" 生成虚拟学生演练剧本`,
          },
        ],
      });
      if (sim && this.sanitizeSimulation(sim)) {
        const parsed = this.sanitizeSimulation(sim)!;
        this.simulationCache.set(scenario, parsed);
        return parsed;
      }
      console.warn('CapabilityAdapter.getSimulation LLM JSON invalid, fallback to Mock', { scenario });
    } catch (e) {
      console.warn('CapabilityAdapter.getSimulation LLM failed, fallback to Mock', e);
    }
    const mockSim = await this.mock.getSimulation(scenario);
    this.simulationCache.set(scenario, mockSim);
    return mockSim;
  }

  async getGames(scenario: ScenarioType): Promise<GameModule[]> {
    const cached = this.gamesCache.get(scenario);
    if (cached) return cached;

    try {
      const { baseURL, apiKey, model } = this.cfg();
      const games = await chatCompletionJSON<GameModule[]>({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是题目设计老师。基于课堂场景，输出符合下列 JSON 结构的互动游戏题库数组（不要再有其它文字）。

场景："${scenario}"

JSON Schema（数组）：
[
  {
    "id": "string 模块 id",
    "title": "string 模块名",
    "type": "choice | match | connect",
    "questions": [
      {
        "id": "string 题 id",
        "type": "choice | match | connect",
        "prompt": "string 题干",
        "options": ["string 选项"],
        "answer": "string 或 string[] (match 用数组)",
        "wikiNodeId": "string 关联知识点 id",
        "explain": "string 可选解析",
        "pairs": [{"left": "string", "right": "string"}] // 仅 connect 用
      }
    ]
  }
]

要求：
- 2-4 个模块，每个模块 2-5 道题
- 题型混合（choice/match/connect）
- 直接输出 JSON 数组`,
          },
          {
            role: 'user',
            content: `为场景 "${scenario}" 生成互动游戏题库`,
          },
        ],
      });
      if (games && this.sanitizeGames(games)) {
        const parsed = this.sanitizeGames(games)!;
        this.gamesCache.set(scenario, parsed);
        return parsed;
      }
      console.warn('CapabilityAdapter.getGames LLM JSON invalid, fallback to Mock', { scenario });
    } catch (e) {
      console.warn('CapabilityAdapter.getGames LLM failed, fallback to Mock', e);
    }
    const mockGames = await this.mock.getGames(scenario);
    this.gamesCache.set(scenario, mockGames);
    return mockGames;
  }
}
