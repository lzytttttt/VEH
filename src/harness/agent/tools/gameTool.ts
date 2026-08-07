import type { ToolDefinition } from '../types';
import { getCapabilityProvider } from '../../providerRegistry';
import type { ScenarioType } from '../../types';

const SCENARIOS = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'] as const;

/** 互动游戏工具：派生学生闯关题目（choice/match/connect 多题型） */
export function createGameTool(): ToolDefinition {
  return {
    name: 'getGames',
    description:
      '派生学生互动游戏题库（含 choice 选择/match 多选/connect 连线题型）。用于"出复习题/出题/闯关"等目标。',
    parameters: {
      type: 'object',
      properties: {
        scenario: { type: 'string', enum: SCENARIOS, description: '课堂场景' },
      },
      required: ['scenario'],
    },
    async execute(args) {
      const scenario = (args.scenario as ScenarioType) ?? 'classroom';
      const games = await getCapabilityProvider().getGames(scenario);
      const totalQuestions = games.reduce((sum, g) => sum + g.questions.length, 0);
      return {
        scenario,
        moduleCount: games.length,
        totalQuestions,
        modules: games.map((g) => ({
          id: g.id,
          title: g.title,
          type: g.type,
          questionCount: g.questions.length,
          questions: g.questions.map((q) => ({
            id: q.id,
            type: q.type,
            prompt: q.prompt,
            wikiNodeId: q.wikiNodeId,
          })),
        })),
      };
    },
  };
}
