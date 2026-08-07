import type { ToolDefinition } from '../types';
import { getLessonPlanGenProvider } from '../../lessonPlan';
import { retrieveContext, indexGenerated } from '../../rag';

/** 教案生成工具：流式生成教案草稿，收集为完整 markdown 返回 */
export function createLessonTool(): ToolDefinition {
  return {
    name: 'generateLessonPlan',
    description:
      '生成教案草稿（markdown，含教学目标/重难点/过程/板书等段落）。用于"生成教案/写教案"等目标。',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '课题' },
        subject: { type: 'string', description: '学科（可选）' },
        duration: { type: 'number', description: '课时分钟（可选）' },
        audience: { type: 'string', description: '学情/目标受众（可选）' },
        objectives: {
          type: 'array',
          items: { type: 'string' },
          description: '教学目标要点（可选）',
        },
      },
      required: ['topic'],
    },
    async execute(args) {
      const provider = getLessonPlanGenProvider();
      // RAG 注入：检索相关旧教案/知识，拼入 audience 供生成参考
      const topic = String(args.topic ?? '');
      const ragCtx = await retrieveContext(topic, 3);
      const audience = args.audience ? String(args.audience) : '';
      const enrichedAudience = audience + (ragCtx ? `${audience ? '\n' : ''}参考知识：\n${ragCtx}` : '');
      let markdown = '';
      for await (const chunk of provider.streamDraft({
        topic,
        subject: args.subject ? String(args.subject) : undefined,
        duration: typeof args.duration === 'number' ? args.duration : undefined,
        audience: enrichedAudience || undefined,
        objectives: Array.isArray(args.objectives)
          ? (args.objectives as string[]).map(String)
          : undefined,
      })) {
        if (chunk.type === 'text') markdown += chunk.content;
        else if (chunk.type === 'section_break') markdown += '\n\n';
      }
      // 生成内容入库（仅 api 模式，供后续检索复用）
      void indexGenerated('lessonPlan', topic, markdown);
      return {
        topic: args.topic,
        charCount: markdown.length,
        // 截断避免上下文爆炸；完整内容已在 UI 侧流式可见
        markdown: markdown.length > 2000 ? markdown.slice(0, 2000) + '\n\n…（已截断）' : markdown,
      };
    },
  };
}
