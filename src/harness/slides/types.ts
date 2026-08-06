/**
 * 课件生成 Harness 类型 — 独立解耦
 *
 * 关注点：课件（Slides Deck）草稿的流式生成与对话式微调，
 * 支持 3 套有实质差异的 design（classic/modern/dataviz）。
 * Mock 内置课件模板（演示脚本），Adapter 接真实 LLM API。
 * 与教案 harness（../lessonPlan/）物理隔离，互不依赖。
 */

/** 3 套 design — 结构/排版/装饰均有实质差异，非简单换皮 */
export type SlideDesign = 'classic' | 'modern' | 'dataviz';

export interface SlidesGenChunk {
  type: 'text' | 'section_break' | 'note';
  content: string;
  /** 第几张幻灯片（0-based），用于 UI 分页渲染 */
  slideIndex?: number;
  done?: boolean;
}

export interface SlidesDraftInput {
  topic: string;
  subject?: string;
  /** 指定生成的 design（影响模板侧重，如 dataviz 多表格） */
  design?: SlideDesign;
  duration?: number;
  audience?: string;
}

export interface SlidesChatInput {
  /** 当前课件内容（slides 用 \n---\n 分页的 markdown） */
  currentContent: string;
  query: string;
  design?: SlideDesign;
}

export interface SlidesGenProvider {
  readonly name: string;
  /** 流式生成草稿：按 `---` 分页增量 yield chunk */
  streamDraft(input: SlidesDraftInput): AsyncIterable<SlidesGenChunk>;
  /** 对话式微调：基于当前课件回答用户追问（流式） */
  streamChat(input: SlidesChatInput): AsyncIterable<SlidesGenChunk>;
}

export interface SlideDesignMeta {
  id: SlideDesign;
  name: string;
  description: string;
}
