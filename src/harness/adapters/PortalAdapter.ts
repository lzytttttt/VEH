import type {
  NavEntry,
  PortalContext,
  PortalNavChunk,
  PortalProvider,
  UserRole,
} from '../types';

/**
 * 门户 LLM API Adapter（骨架）
 *
 * 接入真实 LLM 时实现三个方法：
 * 1. streamNavigate：将 query + PortalContext 序列化为 prompt，调用 LLM 流式接口，
 *    解析 SSE 为 PortalNavChunk（导航项/洞察/建议/数据引用）。
 * 2. getQuickNav：让 LLM 基于角色与上下文动态生成快捷导航项（JSON mode）。
 * 3. getSuggestionChips：让 LLM 基于上下文产出角色级常见提问 chip。
 *
 * 通过环境变量或后端代理注入 apiKey / baseURL / model。
 * 切换此 Adapter 后，业务代码一行不改（与 MockPortalProvider 接口一致）。
 */
export class PortalAdapter implements PortalProvider {
  readonly name = 'Portal LLM Adapter (skeleton)';

  private baseURL = '';
  private apiKey = '';
  private model = '';

  async *streamNavigate(_query: string, _ctx: PortalContext): AsyncIterable<PortalNavChunk> {
    console.error('PortalAdapter not implemented', { baseURL: this.baseURL, model: this.model });
    throw new Error('PortalAdapter.streamNavigate not implemented — 请接入真实 LLM API');
  }

  getQuickNav(_role: UserRole): NavEntry[] {
    throw new Error('PortalAdapter.getQuickNav not implemented — 请接入真实 LLM API');
  }

  getSuggestionChips(_role: UserRole): string[] {
    throw new Error('PortalAdapter.getSuggestionChips not implemented — 请接入真实 LLM API');
  }
}
