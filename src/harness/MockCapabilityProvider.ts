import { getScript } from './MockVLMProvider';
import type {
  CapabilityProvider,
  GameModule,
  ScenarioType,
  SimulationScript,
  WikiContainer,
} from './types';

/**
 * Mock Capability Provider
 *
 * - 脚本派生：getWiki/getSimulation/getGames 均从 ScenarioScript 取数
 * - 与原 getScript(s).wiki 行为等价（零回归），仅是把取数收编进 Provider 接口
 * - 接真实模型 API 时，换 CapabilityAdapter 即可，业务代码一行不改
 */
export class MockCapabilityProvider implements CapabilityProvider {
  readonly name = 'MockCapabilityProvider (Scripted)';

  async getWiki(scenario: ScenarioType): Promise<WikiContainer> {
    return getScript(scenario).wiki;
  }

  async getSimulation(scenario: ScenarioType): Promise<SimulationScript> {
    const script = getScript(scenario);
    return (
      script.simulation ?? {
        scenario,
        classroomTitle: script.title,
        students: [],
        branches: [],
      }
    );
  }

  async getGames(scenario: ScenarioType): Promise<GameModule[]> {
    return getScript(scenario).games ?? [];
  }
}
