/**
 * Agent 编排内核核心类型定义
 *
 * 本文件是 Agent 模块的"契约层"，被 Orchestrator / ToolRegistry / MockOrchestrator /
 * MemoryStore / UI（AgentChatPanel）共同依赖。接口先行，实现可插拔：
 * - 真实 Orchestrator（Orchestrator.ts）：function-calling 优先 + Plan-JSON 降级
 * - Mock Orchestrator（MockOrchestrator.ts）：预制剧本走查，离线演示
 * 两者都实现 AgentOrchestrator 接口，由 providerRegistry 按 active 切换。
 *
 * 与现有 Harness 契约对齐：所有 Tool 的输入输出都是结构化 JSON，复用 Provider 层
 * 既有 sanitize/validate 模式；AgentEvent 与 AnalysisChunk 同为 AsyncIterable 流式产出。
 */

// ============ 事件流 ============

/** Agent 事件类型（Orchestrator 产出，UI/评估层消费） */
export type AgentEventType =
  | 'plan' // LLM 拆解的步骤列表 / 规划说明
  | 'tool_call' // 即将调用某工具
  | 'tool_result' // 工具返回结果
  | 'text' // LLM 中间文本 / 反思 / 最终回答
  | 'done' // 全部完成
  | 'error'; // 出错（含降级信息）

/** 单个 Agent 事件 */
export interface AgentEvent {
  type: AgentEventType;
  /** 文本内容（plan/text/done/error 时填） */
  content?: string;
  /** 当前步骤序号（从 1 起） */
  stepIndex?: number;
  /** 工具名（tool_call/tool_result 时填） */
  toolName?: string;
  /** 工具入参（tool_call 时填） */
  toolArgs?: Record<string, unknown>;
  /** 工具返回值（tool_result 时填） */
  toolResult?: unknown;
  /** 错误信息（error 时填） */
  error?: string;
  /** 本步耗时毫秒（tool_result 时填，便于可观测） */
  elapsedMs?: number;
  /** 是否降级路径产出（便于 UI 标注 / 调试） */
  degraded?: boolean;
}

// ============ 任务 ============

/** 用户提交的 Agent 任务 */
export interface AgentTask {
  /** 自然语言目标，如"把这节课知识点整理成 Wiki 并出一套复习题" */
  goal: string;
  /** 场景上下文（scenario / role / sessionId / 选中节点等），注入 system prompt */
  context?: Record<string, unknown>;
  /** 允许使用的工具白名单（undefined = 全部已注册工具） */
  tools?: string[];
  /** 循环步数上限（默认 8，防止无限循环烧 token） */
  maxSteps?: number;
}

// ============ 工具 ============

/**
 * 工具定义（ToolRegistry 注册项）
 * Orchestrator 会把每个 ToolDefinition 转为 OpenAI 兼容 tools 格式：
 *   { type:'function', function:{ name, description, parameters } }
 */
export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema 描述入参（发给 LLM 供其决定如何调用） */
  parameters: Record<string, unknown>;
  /** 真正执行：入参为 LLM 给出的 args，返回结构化 JSON（被回灌为 tool 角色消息） */
  execute: (
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}

/** 工具注册表接口（实现见 ToolRegistry.ts） */
export interface ToolRegistry {
  /** 注册一个工具 */
  register(tool: ToolDefinition): void;
  /** 按名取工具 */
  get(name: string): ToolDefinition | undefined;
  /** 列出全部已注册工具（供 Orchestrator 构建 tools payload） */
  list(): ToolDefinition[];
  /** 按 active 状态获取启用工具（白名单过滤后的可用集） */
  list(whitelist?: string[]): ToolDefinition[];
}

// ============ 记忆 ============

/**
 * 跨会话记忆接口（实现见 MemoryStore.ts）
 * Agent 用它缓存：模型 tools 能力探测结果、用户偏好、历史生成摘要。
 * agent-core 的 Orchestrator 仅依赖"探测缓存"能力，其余为可选增强。
 */
export interface MemoryStore {
  /** 记录某模型是否支持原生 function-calling（避免重复探测） */
  getToolSupport(model: string): boolean | undefined;
  setToolSupport(model: string, supported: boolean): void;
  /** 用户偏好 / 历史摘要的读写（P2b/P4 增强） */
  getPreference?(key: string): unknown;
  setPreference?(key: string, value: unknown): void;
}

// ============ Orchestrator ============

/** Orchestrator 配置（由 providerRegistry 从 apiConfigStore 注入） */
export interface OrchestratorConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  /** 循环步数上限（默认 8） */
  maxSteps?: number;
  /** 单次 LLM 请求超时毫秒（默认 60000） */
  timeoutMs?: number;
}

/** Agent 编排器接口（真实实现与 Mock 实现均实现此接口） */
export interface AgentOrchestrator {
  readonly name: string;
  /** 执行任务，流式产出事件（UI for await 消费，与 VLMProvider.analyzeStream 同构） */
  run(task: AgentTask): AsyncIterable<AgentEvent>;
  /** 取消正在进行中的任务 */
  cancel?(sessionId: string): void;
}

// ============ 工具函数 ============

/** 可被 cancel 中断的延时（MockOrchestrator 演示节奏用） */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
