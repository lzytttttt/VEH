import type { ToolDefinition } from '../types';
import { getSlidesGenProvider } from '../../slides';

const DESIGNS = ['classic', 'modern', 'dataviz'] as const;

/** 课件生成工具：流式生成课件草稿（按 --- 分页），收集为完整 markdown 返回 */
export function createSlidesTool(): ToolDefinition {
  return {
    name: 'generateSlides',
    description:
      '生成课件草稿（markdown，用 --- 分页，支持 classic/modern/dataviz 三种设计风格）。用于"生成课件/做PPT"等目标。',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '课题' },
        subject: { type: 'string', description: '学科（可选）' },
        design: { type: 'string', enum: DESIGNS, description: '设计风格（可选，默认 classic）' },
        duration: { type: 'number', description: '课时分钟（可选）' },
        audience: { type: 'string', description: '学情/目标受众（可选）' },
      },
      required: ['topic'],
    },
    async execute(args) {
      const provider = getSlidesGenProvider();
      let markdown = '';
      for await (const chunk of provider.streamDraft({
        topic: String(args.topic ?? ''),
        subject: args.subject ? String(args.subject) : undefined,
        design:
          args.design && (DESIGNS as readonly string[]).includes(String(args.design))
            ? (String(args.design) as (typeof DESIGNS)[number])
            : undefined,
        duration: typeof args.duration === 'number' ? args.duration : undefined,
        audience: args.audience ? String(args.audience) : undefined,
      })) {
        if (chunk.type === 'text') markdown += chunk.content;
        else if (chunk.type === 'section_break') markdown += '\n\n';
      }
      const slideCount = markdown.split(/\n---\n/).length;
      return {
        topic: args.topic,
        slideCount,
        charCount: markdown.length,
        markdown: markdown.length > 2000 ? markdown.slice(0, 2000) + '\n\n…（已截断）' : markdown,
      };
    },
  };
}
