/**
 * 教案生成 Harness 类型 — 独立解耦
 *
 * 关注点：教案（Lesson Plan）草稿的流式生成与对话式微调。
 * Mock 内置教学模板（演示脚本），Adapter 接真实 LLM API。
 * 设计目标：UI 只消费 chunk 流，后续接入 LLM 时只换 Adapter，业务代码一行不改。
 * 与课件 harness（../slides/）物理隔离，互不依赖。
 */

export interface LessonPlanGenChunk {
  type: 'text' | 'section_break' | 'note';
  content: string;
  /** 标记 chunk 序列结束（UI 可据此切换状态） */
  done?: boolean;
}

export interface LessonPlanDraftInput {
  /** 课题 */
  topic: string;
  /** 学科 */
  subject?: string;
  /** 课时（分钟） */
  duration?: number;
  /** 学情/目标受众 */
  audience?: string;
  /** 教学目标要点 */
  objectives?: string[];
}

export interface LessonPlanChatInput {
  /** 当前编辑器内容（markdown，作为对话上下文） */
  currentContent: string;
  /** 用户追问 */
  query: string;
}

/** 教案生成 Provider 接口 */
export interface LessonPlanGenProvider {
  readonly name: string;
  /** 流式生成草稿：增量 yield chunk，UI 拼接为完整 markdown */
  streamDraft(input: LessonPlanDraftInput): AsyncIterable<LessonPlanGenChunk>;
  /** 对话式微调：基于当前教案内容回答用户追问（流式） */
  streamChat(input: LessonPlanChatInput): AsyncIterable<LessonPlanGenChunk>;
}
