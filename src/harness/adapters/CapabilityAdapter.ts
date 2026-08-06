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

  async getWiki(scenario: ScenarioType): Promise<WikiContainer> {
    // 缓存命中（同一会话内同场景不重复调用）
    const cached = this.wikiCache.get(scenario);
    if (cached) return cached;

    try {
      const { baseURL, apiKey, model } = this.cfg();
      const wiki = await chatCompletionJSON<WikiContainer>({
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
      if (wiki && this.validateWiki(wiki)) {
        this.wikiCache.set(scenario, wiki);
        return wiki;
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
      if (sim && this.validateSimulation(sim)) {
        this.simulationCache.set(scenario, sim);
        return sim;
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
      if (games && this.validateGames(games)) {
        this.gamesCache.set(scenario, games);
        return games;
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
