import type { ToolDefinition, ToolRegistry as IToolRegistry } from './types';

/**
 * 工具注册表实现
 *
 * Agent Orchestrator 通过它枚举可用工具（构建 OpenAI tools payload）并按名执行。
 * 设计极简：Map 存储，register 幂等（同名覆盖），list 支持白名单过滤。
 */
export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** 列出工具；传白名单时仅返回白名单内且已注册的工具 */
  list(whitelist?: string[]): ToolDefinition[] {
    const all = [...this.tools.values()];
    if (!whitelist || whitelist.length === 0) return all;
    const set = new Set(whitelist);
    return all.filter((t) => set.has(t.name));
  }
}
