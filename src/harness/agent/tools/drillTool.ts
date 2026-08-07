import type { ToolDefinition } from '../types';
import { getCapabilityProvider } from '../../providerRegistry';
import type { ScenarioType } from '../../types';

const SCENARIOS = ['classroom', 'pe', 'lab', 'workshop', 'microlesson'] as const;

/** 虚拟学生演练工具：派生教师应对演练剧本（学生状态 + 情境分支） */
export function createDrillTool(): ToolDefinition {
  return {
    name: 'getSimulation',
    description:
      '派生教师虚拟学生演练剧本：包含学生状态事件与教师应对情境分支。用于"出演练剧本/虚拟学生模拟"等目标。',
    parameters: {
      type: 'object',
      properties: {
        scenario: { type: 'string', enum: SCENARIOS, description: '课堂场景' },
      },
      required: ['scenario'],
    },
    async execute(args) {
      const scenario = (args.scenario as ScenarioType) ?? 'classroom';
      const sim = await getCapabilityProvider().getSimulation(scenario);
      return {
        scenario,
        classroomTitle: sim.classroomTitle,
        studentCount: sim.students.length,
        branchCount: sim.branches.length,
        students: sim.students.map((s) => ({ id: s.id, name: s.name, state: s.state })),
        branches: sim.branches.map((b) => ({
          id: b.id,
          situation: b.situation,
          optionCount: b.options.length,
        })),
      };
    },
  };
}
