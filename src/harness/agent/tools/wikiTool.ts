import type { ToolDefinition } from '../types';
import { getCapabilityProvider } from '../../providerRegistry';
import type { ScenarioType } from '../../types';

const SCENARIOS = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'] as const;

/** 知识 WIKI 工具：获取某场景的知识节点（含标题/分类/关联，便于后续出题或整理） */
export function createWikiTool(): ToolDefinition {
  return {
    name: 'getWiki',
    description:
      '获取指定场景的知识 WIKI 节点列表（知识点标题、分类、关联节点）。用于"整理知识点/建Wiki"等目标。',
    parameters: {
      type: 'object',
      properties: {
        scenario: { type: 'string', enum: SCENARIOS, description: '课堂场景' },
      },
      required: ['scenario'],
    },
    async execute(args) {
      const scenario = (args.scenario as ScenarioType) ?? 'classroom';
      const wiki = await getCapabilityProvider().getWiki(scenario);
      return {
        scenario,
        nodeCount: wiki.nodes.length,
        nodes: wiki.nodes.map((n) => ({
          id: n.id,
          title: n.title,
          category: n.category,
          summary: n.summary,
          related: n.related,
        })),
      };
    },
  };
}
