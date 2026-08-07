/**
 * Harness 层核心类型定义
 * 该层与平台完全解耦，UI 只消费 AnalysisChunk 流，不关心底层是 Mock 还是真实 API
 */

export type ScenarioType =
  | 'classroom'
  | 'pe'
  | 'lab'
  | 'workshop'
  | 'microlesson';

export type AnalysisMode = 'realtime' | 'playback';

export type UserRole = 'teacher' | 'student' | 'admin';

/** 视频帧采样（每帧含可视化描述 + 关键指标） */
export interface FrameSample {
  t: number; // 相对秒数
  snapshot: string; // 场景描述（驱动虚拟画面渲染）
  metrics?: Record<string, number>; // 帧级指标
  /** 真实课堂图片 base64（data:image/...;base64,...），有值时 VLM 走多模态识别 */
  imageData?: string;
  /** 上传图片的原始文件大小（bytes），MockImageResolver 用于指纹匹配（P3 多模态 mock） */
  imageFileSize?: number;
}

/** 转录行（音频转写） */
export interface TranscriptLine {
  t: number;
  speaker: 'teacher' | 'student' | 'system';
  text: string;
}

/** 学生个体时间线点 */
export interface StudentTimelinePoint {
  t: number;
  attention: number; // 0-1 注意度
  state: string; // 状态标签：听讲/走神/讨论/提问...
  note?: string;
}

/** 学生个体观察数据 */
export interface StudentObservation {
  id: string;
  name: string;
  avatarColor: string;
  timeline: StudentTimelinePoint[];
  feedback: string; // AI 个性化反馈
}

/** 知识 WIKI 节点 */
export interface WikiNode {
  id: string;
  title: string;
  category: string;
  summary: string;
  details: string;
  related: string[]; // 关联节点 id
  classroomRefs: { t: number; type: string; label: string }[];
}

/** WIKI 节点的 AI 助手脚本问答 */
export interface AssistantScriptItem {
  q: string;
  a: string;
  keywords?: string[]; // 关键词匹配
}

/** 知识 WIKI 容器 */
export interface WikiContainer {
  nodes: WikiNode[];
  assistantScript: AssistantScriptItem[];
}

/** 虚拟学生演练：某时刻的学生状态事件 */
export interface VirtualStudentState {
  id: string;
  name: string;
  avatarColor: string;
  /** 课堂时间点触发（秒） */
  triggerT: number;
  state: 'attentive' | 'distracted' | 'asking' | 'discussing';
  /** 学生行为/台词 */
  prompt: string;
}

/** 教师虚拟学生模拟演练剧本（根据课程分析结果派生） */
export interface SimulationScript {
  scenario: ScenarioType;
  classroomTitle: string;
  students: VirtualStudentState[];
  /** 教师应对分支：每个情境给出若干选项 + 脚本反馈 + 评分 */
  branches: {
    id: string;
    situation: string;
    options: { id: string; label: string; feedback: string; score: number }[];
  }[];
}

/** 学生互动游戏题目 */
export interface GameQuestion {
  id: string;
  type: 'choice' | 'match' | 'connect';
  prompt: string;
  options: string[];
  /** choice: 单选字符串；match: 多选正确项数组；connect: 正确配对（配对数据见 pairs） */
  answer: string | string[];
  /** 关联的知识点 id（保证"根据课程分析结果提升能力"的数据闭环） */
  wikiNodeId: string;
  explain?: string;
  /** connect 题专用：左右配对项 */
  pairs?: { left: string; right: string }[];
}

/** 游戏模块 */
export interface GameModule {
  id: string;
  title: string;
  type: GameQuestion['type'];
  questions: GameQuestion[];
}

/** Chunk 类型 — 决定 UI 如何渲染该事件 */
export type AnalysisChunkType =
  | 'text' // 流式 LLM 分析文本
  | 'event' // 关键事件标签（如"板书启动"）
  | 'metric' // 指标快照（抬头率/参与度...）
  | 'frame_ref' // 帧引用（标记虚拟画面切换）
  | 'student' // 学生个体观察
  | 'wiki'; // 知识节点

export interface AnalysisChunk {
  type: AnalysisChunkType;
  content: string;
  timestamp: number; // chunk 对应的课堂时间（秒）
  confidence?: number;
  label?: string;
  studentId?: string; // type='student' 时必填
  wikiNodeId?: string; // type='wiki' 时必填
}

/** 历史上下文（用于多 session 聚合分析） */
export interface PriorContext {
  teacherProfileId?: string;
  studentProfileId?: string;
  priorSessionIds?: string[];
}

/** Provider 输入 */
export interface AnalysisInput {
  scenario: ScenarioType;
  mode: AnalysisMode;
  role: UserRole;
  studentId?: string; // 学生视角时聚焦特定学生
  frames: FrameSample[];
  transcript: TranscriptLine[];
  context?: PriorContext;
  /** 回放模式：从该时间点开始；实时模式忽略 */
  startFrom?: number;
  /** 倍速（仅回放模式有效） */
  speed?: number;
}

/** 完整剧本结构（Mock Provider 数据源） */
export interface ScenarioScript {
  scenario: ScenarioType;
  title: string;
  duration: number; // 总时长（秒）
  frames: FrameSample[];
  transcript: TranscriptLine[];
  /** 主分析流时间线（按 t 排序的 chunk） */
  analysisScript: AnalysisChunk[];
  students: StudentObservation[];
  wiki: WikiContainer;
  /** 教师虚拟学生演练剧本（可选，未配置则 Mock 返回空结构） */
  simulation?: SimulationScript;
  /** 学生互动游戏模块（可选） */
  games?: GameModule[];
  /** 场景指标基线（用于报告） */
  metrics: {
    teaching: number; // 教学质量
    engagement: number; // 学生参与度
    interaction: number; // 互动性
    compliance: number; // 规范性
    innovation: number; // 创新性
  };
}

/**
 * VLM Provider 接口
 * UI 通过此接口订阅分析流，不感知底层实现
 */
export interface VLMProvider {
  readonly name: string;
  /** 异步迭代器：增量 yield chunk，UI for await 消费 */
  analyzeStream(input: AnalysisInput): AsyncIterable<AnalysisChunk>;
  /** 取消正在进行中的分析（用于切换模式/停止） */
  cancel?(sessionId: string): void;
}

/**
 * 能力提升 Provider — 与 VLMProvider 并行的解耦接口
 *
 * 关注点不同：VLMProvider 负责流式课堂分析；CapabilityProvider 负责
 * 知识 WIKI / 虚拟学生演练 / 互动游戏的取数。Mock 返回 script 派生数据，
 * adapter 调真实模型 API。UI 只消费此接口，切换 Adapter 业务代码一行不改。
 */
export interface CapabilityProvider {
  readonly name: string;
  /** 获取某场景的知识 WIKI（闭合 WikiApp 直接 getScript 的 harness 缺口） */
  getWiki(scenario: ScenarioType): Promise<WikiContainer>;
  /** 获取教师虚拟学生演练剧本 */
  getSimulation(scenario: ScenarioType): Promise<SimulationScript>;
  /** 获取学生互动游戏模块 */
  getGames(scenario: ScenarioType): Promise<GameModule[]>;
}

// ============ 治理编排层（GovernanceProvider） ============
// 与 VLMProvider / CapabilityProvider 并列的第三个 Provider。
// 关注点：面向管理岗位的 AI agent 洞察编排。
// 数据分层治理：
//   Layer1 Raw      → GovernanceContext.raw（AI 消费，不直接渲染）
//   Layer2 Aggregated → GovernanceContext.aggregates（AI 参考 + 用户图表双用）
//   Layer3 Agent Output → GovernanceChunk / AnomalyAlert / ResearchSuggestion（AI 产出，用户消费）
//   Layer4 Presentation → 图表 / 卡片 / 对话（用户直接呈现，由 Apps 层渲染）

/** 组织架构快照（harness 层独立定义，不依赖 data 层持久化结构） */
export interface OrgSnapshot {
  schools: { id: string; name: string; type: string }[];
  terms: { id: string; name: string; isCurrent: boolean }[];
  grades: { id: string; name: string; schoolId: string }[];
  classes: { id: string; name: string; gradeId: string; studentCount: number }[];
  subjects: { id: string; name: string }[];
}

/** AI 消费的会话摘要（从 data 层 SessionRecord 投影，由 governanceStore 适配转换） */
export interface SessionSummary {
  id: string;
  scenario: ScenarioType;
  title: string;
  teacherId: string;
  teacherName: string;
  date: string;
  duration: number;
  metrics: { teaching: number; engagement: number; interaction: number; compliance: number; innovation: number };
  studentCount: number;
  classId: string;
  gradeId: string;
  termId: string;
  subjectId: string;
}

/** AI 消费的教师摘要 */
export interface TeacherSummary {
  id: string;
  name: string;
  subject: string;
  title: string;
  department?: string;
  sessionCount: number;
}

// —— Layer 2: 聚合统计（AI 参考 + 用户图表双用） ——

export interface SchoolOverview {
  totalScore: number;
  scoreChange: number; // 环比（与上学期差值）
  analyzedSessions: number;
  totalSessions: number;
  coverageRate: number;
  activeTeachers: number;
  activeClasses: number;
}

export interface ClassComparisonRow {
  classId: string;
  className: string;
  avgScore: number;
  sessionCount: number;
  studentCount: number;
  trend: number; // 与上学期差值
}

export interface SubjectComparisonRow {
  subjectId: string;
  subjectName: string;
  avgScore: number;
  teacherCount: number;
  sessionCount: number;
}

export interface TeacherComparisonRow {
  teacherId: string;
  teacherName: string;
  subject: string;
  avgScore: number;
  sessionCount: number;
  metrics: { teaching: number; engagement: number; interaction: number; compliance: number; innovation: number };
}

export interface TrendSeries {
  termId: string;
  termName: string;
  avgScore: number;
  sessionCount: number;
}

// —— Layer 1: AI 消费的数据上下文 ——

export interface GovernanceContext {
  /** 原始数据层 — 喂给 AI 的完整数据，不直接展示给用户 */
  raw: {
    sessions: SessionSummary[];
    teachers: TeacherSummary[];
    org: OrgSnapshot;
  };
  /** 聚合层 — AI 参考 + 用户图表共用 */
  aggregates: {
    schoolOverview: SchoolOverview;
    classComparison: ClassComparisonRow[];
    subjectComparison: SubjectComparisonRow[];
    teacherComparison: TeacherComparisonRow[];
    trends: TrendSeries[];
  };
}

// —— Layer 3: Agent 产出（用户消费） ——

export type GovernanceChunkType = 'insight' | 'alert' | 'suggestion' | 'metric_ref';

export interface GovernanceChunk {
  type: GovernanceChunkType;
  content: string;
  /** 引用的数据/指标 ID（用于图表联动高亮） */
  refId?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface AnomalyAlert {
  id: string;
  type: 'score_drop' | 'low_engagement' | 'compliance_risk' | 'coverage_gap';
  target: { type: 'teacher' | 'class' | 'subject'; id: string; name: string };
  severity: 'warning' | 'critical';
  description: string;
  metric: string;
  value: number;
  threshold: number;
}

export interface ResearchSuggestion {
  target: { type: 'teacher' | 'class' | 'subject'; id: string; name: string };
  dimension: string;
  currentScore: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// —— 第三个 Provider 接口 ——

export interface GovernanceProvider {
  readonly name: string;
  /** 流式治理简报（复用 VLMProvider AsyncIterable 模式，增量 yield chunk） */
  streamBriefing(ctx: GovernanceContext): AsyncIterable<GovernanceChunk>;
  /** 对话式洞察（流式） */
  streamInsight(query: string, ctx: GovernanceContext): AsyncIterable<GovernanceChunk>;
  /** 异常预警扫描（复用 CapabilityProvider Promise 模式） */
  detectAnomalies(ctx: GovernanceContext): Promise<AnomalyAlert[]>;
  /** 教研建议生成 */
  suggestResearch(
    target: { type: 'teacher' | 'class' | 'subject'; id: string },
    ctx: GovernanceContext,
  ): Promise<ResearchSuggestion>;
}

// ============ 门户编排层（PortalProvider） ============
// 与 VLMProvider / CapabilityProvider / GovernanceProvider 并列的第四个 Provider。
// 关注点：面向登录门户的 AI Agent 检索导航编排。
// 数据契约同 Governance：UI 侧构建 PortalContext 注入，Provider 只产 Layer3 导航/洞察 chunk，
// 不直接读 stores/data 层，保证 Harness 与平台解耦、可审计。

/** 门户上下文（UI 侧聚合后注入 Provider） */
export interface PortalContext {
  role: UserRole;
  /** 当前角色可用的应用清单（来自 apps/registry，已按角色过滤） */
  apps: { id: string; name: string; icon: string; category: string; description: string }[];
  /** 角色级数据摘要（Layer2 聚合投影，供 AI 引用） */
  summary: RoleSummary;
}

/** 角色级数据摘要 */
export interface RoleSummary {
  cards: SummaryCard[];
  /** 一句话亮点（喂给 AI 的简短上下文） */
  highlights: string[];
}

/** 数据概览卡片（可点击跳转应用） */
export interface SummaryCard {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
  refAppId?: string;
}

export type PortalNavChunkType = 'nav_result' | 'insight' | 'suggestion' | 'data_ref';

/** 门户 Agent 产出的导航 chunk */
export interface PortalNavChunk {
  type: PortalNavChunkType;
  content: string;
  /** nav_result 时必填：可直接 openWindow 的应用 id */
  appId?: string;
  appName?: string;
  appIcon?: string;
  /** data_ref 引用的摘要卡片 label */
  refId?: string;
  severity?: 'info' | 'warning' | 'critical';
}

/** 快捷导航项（演示脚本驱动） */
export interface NavEntry {
  appId: string;
  name: string;
  icon: string;
  category: string;
  reason: string;
}

/** 第四个 Provider 接口 */
export interface PortalProvider {
  readonly name: string;
  /** 流式检索导航：自然语言 query → 增量 yield 导航/洞察/建议 chunk */
  streamNavigate(query: string, ctx: PortalContext): AsyncIterable<PortalNavChunk>;
  /** 角色级快捷导航项 */
  getQuickNav(role: UserRole): NavEntry[];
  /** 角色级建议 chip（常见提问） */
  getSuggestionChips(role: UserRole): string[];
}
