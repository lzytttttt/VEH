/**
 * Agent Harness 自包含注册中心
 *
 * 遵循 lessonPlan/、slides/ 的「物理隔离自包含」模式（指南 §7.2），
 * 不放入中央 providerRegistry.ts，active 独立于其他 Provider。
 *
 * active 来自 apiConfigStore 的 'agent' 条目：
 * - 'mock' → MockOrchestrator（预制剧本走查，离线演示）
 * - 'api'  → Orchestrator（真实 function-calling + Plan-JSON 降级）
 *
 * 工具注册表在首次获取时构建并缓存（与 Orchestrator/MockOrchestrator 实例解耦，
 * 切换 active 时复用同一 ToolRegistry，仅重建编排器）。
 */
import { ToolRegistry } from './ToolRegistry';
import { Orchestrator } from './Orchestrator';
import { MockOrchestrator } from './MockOrchestrator';
import { getProviderConfig } from '../../stores/apiConfigStore';
import type { AgentOrchestrator, OrchestratorConfig } from './types';
import { createAnalyzeTool } from './tools/analyzeTool';
import { createWikiTool } from './tools/wikiTool';
import { createDrillTool } from './tools/drillTool';
import { createGameTool } from './tools/gameTool';
import { createLessonTool } from './tools/lessonTool';
import { createSlidesTool } from './tools/slidesTool';
import { createGovernanceTool } from './tools/governanceTool';

/** 构建并注册全部 7 个工具（复用现有 Provider） */
export function buildToolRegistry(): ToolRegistry {
  const reg = new ToolRegistry();
  reg.register(createAnalyzeTool());
  reg.register(createWikiTool());
  reg.register(createDrillTool());
  reg.register(createGameTool());
  reg.register(createLessonTool());
  reg.register(createSlidesTool());
  reg.register(createGovernanceTool());
  return reg;
}

// 工具注册表复用（切换 active 不重建工具，仅重建编排器）
let sharedRegistry: ToolRegistry | null = null;
function getSharedRegistry(): ToolRegistry {
  if (!sharedRegistry) sharedRegistry = buildToolRegistry();
  return sharedRegistry;
}

let cached: AgentOrchestrator | null = null;
let lastCachedName: string | null = null;

/** 获取当前 active 的 Agent Orchestrator（mock / api），带实例缓存 */
export function getAgentOrchestrator(name?: string): AgentOrchestrator {
  const active = name ?? getProviderConfig('agent').active;
  if (cached && lastCachedName === active) return cached;

  const registry = getSharedRegistry();
  if (active === 'api') {
    cached = new Orchestrator(registry, () => {
      const c = getProviderConfig('agent');
      const cfg: OrchestratorConfig = {
        baseURL: c.baseURL || '/api/llm',
        apiKey: c.apiKey,
        model: c.model || 'deepseek-v4-flash',
      };
      return cfg;
    });
  } else {
    cached = new MockOrchestrator(registry);
  }
  lastCachedName = active;
  return cached;
}

export function listAgentOrchestrators(): { id: string; name: string; available: boolean }[] {
  return [
    { id: 'mock', name: 'Mock Agent (预制剧本)', available: true },
    { id: 'api', name: 'Agent Orchestrator (function-calling)', available: true },
  ];
}

export type { AgentOrchestrator, AgentEvent, AgentTask } from './types';
