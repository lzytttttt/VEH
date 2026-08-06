import type {
  NavEntry,
  PortalContext,
  PortalNavChunk,
  PortalProvider,
  UserRole,
} from '../types';
import { streamChatCompletion, createAbortController } from './sseUtils';
import { getProviderConfig } from '../../stores/apiConfigStore';
import { MockPortalProvider } from '../MockPortalProvider';

/**
 * 门户 LLM API Adapter
 *
 * 设计取舍：
 * - streamNavigate：真实 LLM SSE 流式（门户检索的核心价值）
 * - getQuickNav / getSuggestionChips：同步方法，无法 await LLM；
 *   委托 MockPortalProvider 返回脚本预设的角色级快捷入口与建议 chip
 *   （这些是固定的 UI 快捷方式，LLM 动态生成价值有限且增加首屏延迟）
 *
 * 配置从 apiConfigStore 的 'portal' 条目懒读取（调用时取最新）。
 */
export class PortalAdapter implements PortalProvider {
  readonly name = 'Portal LLM Adapter';
  private mock = new MockPortalProvider();
  private controllers = new Map<string, AbortController>();

  private cfg() {
    const c = getProviderConfig('portal');
    return {
      baseURL: c.baseURL || '/api/llm',
      apiKey: c.apiKey,
      model: c.model || 'deepseek-v4-flash',
    };
  }

  /** 同步：委托 Mock 脚本数据（角色级快捷入口，无需 LLM） */
  getQuickNav(role: UserRole): NavEntry[] {
    return this.mock.getQuickNav(role);
  }

  /** 同步：委托 Mock 脚本数据（角色级建议 chip） */
  getSuggestionChips(role: UserRole): string[] {
    return this.mock.getSuggestionChips(role);
  }

  /**
   * 流式检索导航：真实 LLM SSE
   *
   * 先用关键词匹配 yield 结构化 nav_result（可点击打开 app），
   * 再调 LLM 流式产出自然语言洞察/建议作为 insight chunk。
   */
  async *streamNavigate(query: string, ctx: PortalContext): AsyncIterable<PortalNavChunk> {
    // 1. 先用 Mock 关键词匹配产出结构化导航项（即时，可点击打开 app）
    const mockChunks = this.mock.streamNavigate(query, ctx);
    for await (const c of mockChunks) {
      if (c.type === 'nav_result') yield c; // 只取导航项，洞察交给 LLM
    }

    // 2. 调 LLM 流式产出自然语言洞察
    const sessionId = `portal-${Date.now()}`;
    const controller = createAbortController();
    this.controllers.set(sessionId, controller);

    const { baseURL, apiKey, model } = this.cfg();
    const appList = ctx.apps.map((a) => `- ${a.id}: ${a.name}（${a.description}）`).join('\n');
    const summaryStr = ctx.summary.cards.map((c) => `${c.label}=${c.value}`).join('；');

    try {
      const tokens = streamChatCompletion({
        baseURL,
        apiKey,
        model,
        messages: [
          {
            role: 'system',
            content: `你是校园门户的 AI 检索助手。根据用户提问，结合当前角色的可用功能与数据概览，给出简洁的检索建议与洞察。
可用功能清单：
${appList}

数据概览：${summaryStr}

要求：
- 用中文，简洁明了，2-4 句话
- 如果提问匹配某功能，明确推荐并说明用途
- 如果是数据类提问，引用概览数据给出解读
- 直接输出回答，不要前缀/解释`,
          },
          { role: 'user', content: query },
        ],
        bodyOverrides: { temperature: 0.4 },
        signal: controller.signal,
      });

      let buf = '';
      for await (const tok of tokens) {
        if (controller.signal.aborted) break;
        buf += tok;
        if (buf.includes('\n')) {
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim()) yield { type: 'insight', content: line.trim() };
          }
        }
      }
      if (buf.trim()) yield { type: 'insight', content: buf.trim() };
    } catch (e) {
      // LLM 失败时降级：yield 一条提示，不中断 UI
      const msg = e instanceof Error ? e.message : String(e);
      yield {
        type: 'suggestion',
        content: `（LLM 检索暂时不可用：${msg.slice(0, 100)}。已为你展示关键词匹配结果。）`,
        severity: 'info',
      };
    } finally {
      this.controllers.delete(sessionId);
    }
  }

  cancel(sessionId: string): void {
    const c = this.controllers.get(sessionId);
    if (c) {
      c.abort();
      this.controllers.delete(sessionId);
    }
  }
}
