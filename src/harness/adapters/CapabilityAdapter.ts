import type {
  CapabilityProvider,
  GameModule,
  ScenarioType,
  SimulationScript,
  WikiContainer,
} from '../types';

/**
 * 真实模型 API Adapter（骨架）
 *
 * 接入真实模型 API 时实现 getWiki/getSimulation/getGames：
 * 1. getWiki：将课堂分析结果送入模型，抽取知识节点 + 关联 + 助手脚本
 * 2. getSimulation：基于分析结果派生虚拟学生行为剧本与教师应对分支
 * 3. getGames：根据 wiki 节点生成题目（choice/match/connect）
 * 通过环境变量或后端代理注入 apiKey / baseURL / model
 */
export class CapabilityAdapter implements CapabilityProvider {
  readonly name = 'Capability API Adapter (skeleton)';

  async getWiki(_scenario: ScenarioType): Promise<WikiContainer> {
    throw new Error('CapabilityAdapter.getWiki not implemented — 请接入真实模型 API');
  }

  async getSimulation(_scenario: ScenarioType): Promise<SimulationScript> {
    throw new Error('CapabilityAdapter.getSimulation not implemented — 请接入真实模型 API');
  }

  async getGames(_scenario: ScenarioType): Promise<GameModule[]> {
    throw new Error('CapabilityAdapter.getGames not implemented — 请接入真实模型 API');
  }
}
