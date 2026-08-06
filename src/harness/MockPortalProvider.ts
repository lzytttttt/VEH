import portalScript from './scripts/portal.json';
import type {
  NavEntry,
  PortalContext,
  PortalNavChunk,
  PortalProvider,
  UserRole,
} from './types';

/**
 * Mock Portal Provider
 *
 * 演示脚本驱动 + 流式导航：
 * - streamNavigate 复用 MockGovernanceProvider 的 sleep/yield 模式，增量 yield chunk
 * - getQuickNav / getSuggestionChips 复用 CapabilityProvider 的取数模式（读 portal.json）
 * - 关键词规则匹配 query → nav_result；数据类提问 → data_ref；无匹配 → 引导建议
 *
 * 接入真实 LLM 时换 PortalAdapter 即可，业务代码一行不改。
 */
interface KeywordRule {
  keywords: string[];
  appId: string;
  reason: string;
}

interface PortalScript {
  quickNav: Record<UserRole, NavEntry[]>;
  suggestionChips: Record<UserRole, string[]>;
  keywordRules: KeywordRule[];
}

const SCRIPT = portalScript as unknown as PortalScript;

export class MockPortalProvider implements PortalProvider {
  readonly name = 'MockPortalProvider (Scripted)';

  getQuickNav(role: UserRole): NavEntry[] {
    return SCRIPT.quickNav[role] ?? [];
  }

  getSuggestionChips(role: UserRole): string[] {
    return SCRIPT.suggestionChips[role] ?? [];
  }

  async *streamNavigate(query: string, ctx: PortalContext): AsyncIterable<PortalNavChunk> {
    const chunks = matchNavigate(query, ctx);
    for (const c of chunks) {
      await sleep(260);
      yield c;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 关键词匹配 → 导航/数据/洞察 chunk 序列 */
function matchNavigate(query: string, ctx: PortalContext): PortalNavChunk[] {
  const out: PortalNavChunk[] = [];
  const q = query.toLowerCase();
  const matched = new Set<string>();

  // 1. 关键词规则 → 导航项
  for (const rule of SCRIPT.keywordRules) {
    if (matched.has(rule.appId)) continue;
    if (rule.keywords.some((k) => q.includes(k.toLowerCase()))) {
      const app = ctx.apps.find((a) => a.id === rule.appId);
      if (app) {
        out.push({
          type: 'nav_result',
          content: rule.reason,
          appId: app.id,
          appName: app.name,
          appIcon: app.icon,
        });
        matched.add(rule.appId);
      }
    }
  }

  // 2. 数据类提问 → 引用摘要卡片
  if (/(数据|概览|统计|评分|趋势|多少|几节|得分|覆盖率|成绩|均分)/.test(q)) {
    for (const card of ctx.summary.cards.slice(0, 4)) {
      out.push({
        type: 'data_ref',
        content: `${card.label}：${card.value}${card.hint ? `（${card.hint}）` : ''}`,
        refId: card.label,
        severity: 'info',
      });
    }
  }

  // 3. 角色级洞察
  if (ctx.summary.highlights.length > 0) {
    out.push({ type: 'insight', content: ctx.summary.highlights[0] });
  }

  // 4. 无匹配 → 引导建议 + 推荐功能
  if (out.length === 0) {
    const chips = SCRIPT.suggestionChips[ctx.role]?.slice(0, 3).join('、') ?? '检索功能或数据';
    out.push({
      type: 'suggestion',
      content: `未找到"${query}"的直接匹配。可尝试：${chips}`,
      severity: 'info',
    });
    for (const app of ctx.apps.slice(0, 3)) {
      out.push({
        type: 'nav_result',
        content: '推荐功能',
        appId: app.id,
        appName: app.name,
        appIcon: app.icon,
      });
    }
  }

  return out;
}
