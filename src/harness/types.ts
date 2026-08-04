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

export type UserRole = 'teacher' | 'student';

/** 视频帧采样（每帧含可视化描述 + 关键指标） */
export interface FrameSample {
  t: number; // 相对秒数
  snapshot: string; // 场景描述（驱动虚拟画面渲染）
  metrics?: Record<string, number>; // 帧级指标
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
