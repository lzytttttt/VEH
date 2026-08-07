import type { ToolDefinition } from '../types';
import { getProvider } from '../../providerRegistry';
import { getScript } from '../../MockVLMProvider';
import type { AnalysisInput, ScenarioType } from '../../types';

const SCENARIOS = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'] as const;

/** 课堂分析工具：调 VLM Provider 流式分析，收集为事件摘要返回 */
export function createAnalyzeTool(): ToolDefinition {
  return {
    name: 'analyzeClassroom',
    description:
      '分析指定场景的课堂，产出关键事件流与指标摘要。用于"分析课堂/这堂课怎么样/整理知识点"等目标的前置步骤。',
    parameters: {
      type: 'object',
      properties: {
        scenario: {
          type: 'string',
          enum: SCENARIOS,
          description: '课堂场景：classroom=普通教室 / pe=体育 / lab=实验 / workshop=实训 / microlesson=微课',
        },
      },
      required: ['scenario'],
    },
    async execute(args) {
      const scenario = (args.scenario as ScenarioType) ?? 'classroom';
      const script = getScript(scenario);
      const input: AnalysisInput = {
        scenario,
        mode: 'playback',
        role: 'teacher',
        frames: script.frames,
        transcript: script.transcript,
        // 高倍速让 Mock 回放快速完成（api 模式忽略）
        speed: 20,
      };
      const events: string[] = [];
      for await (const chunk of getProvider().analyzeStream(input)) {
        if (chunk.type === 'event') {
          events.push(`[${chunk.timestamp}s] 事件：${chunk.label ?? chunk.content}`);
        } else if (chunk.type === 'text') {
          events.push(`[${chunk.timestamp}s] ${chunk.content}`);
        }
      }
      return {
        scenario,
        title: script.title,
        durationSec: script.duration,
        eventCount: events.length,
        metrics: script.metrics,
        summary: events.slice(0, 15).join('\n') || '（无事件）',
      };
    },
  };
}
