import { useEffect, useMemo, useRef, useState } from 'react';
import { getPortalProvider } from '../harness/providerRegistry';
import type {
  PortalContext,
  PortalNavChunk,
  PortalNavChunkType,
  UserRole,
} from '../harness/types';
import { useAuthStore } from '../stores/authStore';
import { usePortalStore } from '../stores/portalStore';
import { useWindowStore } from '../stores/windowStore';
import { findApp } from './registry';
import { launchApp } from './launcher';
import StatCard from '../components/StatCard';
import { useIsMobile } from '../lib/useIsMobile';

const ROLE_TITLE: Record<UserRole, string> = {
  teacher: '教师工作台',
  student: '学生学习台',
  admin: '管理驾驶台',
};

const ROLE_GREETING: Record<UserRole, string> = {
  teacher: '教学反思 · 画像复盘 · 演练提升',
  student: '课堂回顾 · 知识闯关 · 笔记收藏',
  admin: '全校治理 · AI Agent 洞察 · 教务管理',
};

const CHUNK_STYLE: Record<PortalNavChunkType, { bg: string; border: string; icon: string }> = {
  nav_result: { bg: '#e0e0ff', border: '#000080', icon: '🎯' },
  insight: { bg: '#ffffe0', border: '#808000', icon: '💡' },
  suggestion: { bg: '#e0ffe0', border: '#008000', icon: '✅' },
  data_ref: { bg: '#e0ffff', border: '#1084D0', icon: '📊' },
};

/**
 * 角色自适应管理门户 —— 登录后默认弹出的英雄窗口
 * 顶部最显眼处为 AI Agent 检索导航栏（输入即流式直达功能/数据）
 * 数据与导航均经 PortalProvider 编排，Mock→Adapter 切换业务零改动
 *
 * 布局约定（保证每个区块边界清晰、绝不互相溢出）：
 * 根 flex column + overflow:hidden，各区段互不重叠：
 *   Hero   —— 自动撑高
 *   Flow   —— 固定高 96px，内部 overflow:auto
 *   Grid行 —— flex:1 min-height:0，分两列各占 ~52% / 48%
 *     └ fieldset 用 display:flex column + min-height:0
 *     └ 内层 grid/flex 子内容独立 overflow:auto
 *   Quick  —— 自动撑高
 */
export default function PortalApp() {
  const user = useAuthStore((s) => s.user)!;
  const role = user.role;
  const isMobile = useIsMobile();
  const buildCtx = usePortalStore((s) => s.buildPortalContext);
  const ctx: PortalContext = useMemo(() => buildCtx(role), [buildCtx, role]);
  const openWindow = useWindowStore((s) => s.openWindow);

  const provider = useMemo(() => getPortalProvider(), []);
  const quickNav = useMemo(() => provider.getQuickNav(role), [provider, role]);
  const chips = useMemo(() => provider.getSuggestionChips(role), [provider, role]);

  const [query, setQuery] = useState('');
  const [chunks, setChunks] = useState<PortalNavChunk[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(false);

  // 初始化：以角色级 highlights 作为 Agent 问候
  useEffect(() => {
    setChunks(ctx.summary.highlights.map((h) => ({ type: 'insight' as const, content: h })));
  }, [ctx]);

  useEffect(() => () => { abortRef.current = true; }, []);

  const openApp = (appId: string) => {
    const app = findApp(appId);
    if (!app) return;
    const count = useWindowStore.getState().windows.length;
    openWindow({
      id: app.id,
      title: app.name,
      icon: app.icon,
      x: 60 + (count % 6) * 26,
      y: 40 + (count % 5) * 22,
      width: app.width,
      height: app.height,
      content: launchApp(app.id, role),
    });
  };

  const handleSearch = async (q?: string) => {
    const question = (q ?? query).trim();
    if (!question || streaming) return;
    setQuery(question);
    setChunks([]);
    setStreaming(true);
    abortRef.current = false;
    try {
      for await (const chunk of provider.streamNavigate(question, ctx)) {
        if (abortRef.current) break;
        setChunks((prev) => [...prev, chunk]);
      }
    } catch (e) {
      console.error('streamNavigate failed', e);
    }
    setStreaming(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  // —— 通用 fieldset panel：display:flex column + min-height:0 保证子区可独立滚动 ——
  const fieldsetStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
  };

  const scrollStyle: React.CSSProperties = {
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'auto',
  };

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100%',
        overflow: isMobile ? 'auto' : 'hidden',
        padding: '4px',
        gap: '6px',
        fontSize: '12px',
        boxSizing: 'border-box',
      }}
    >
      {/* —— 顶部 Hero 检索区（最显眼） —— 自动撑高 —— */}
      <div
        className="win-raised"
        style={{
          flexShrink: 0,
          padding: '8px 10px',
          background: 'linear-gradient(135deg, rgba(0,0,128,0.10), rgba(16,132,208,0.10))',
          boxShadow:
            'inset 0 0 0 2px #000080, inset 0 0 0 3px #1084D0, inset -1px -1px var(--win-btn-darkshadow), inset 1px 1px var(--win-btn-highlight)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '4px', gap: '8px' }}>
          <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🤖</span>
            <div style={{ minWidth: 0 }}>
              <div className="win-text win-text-bold" style={{ fontSize: '15px', color: '#000080', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ROLE_TITLE[role]} · AI Agent 检索导航
              </div>
              <div className="win-text" style={{ fontSize: '11px', color: '#008080', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name} · {user.title} · {ROLE_GREETING[role]}
              </div>
            </div>
          </div>
          <span className="win-text" style={{ fontSize: '10px', color: '#808080', flexShrink: 0 }}>关闭后可从桌面图标重开</span>
        </div>

        <div className="flex items-center gap-1">
          <input
            className="win-input flex-1"
            type="text"
            placeholder="向 AI Agent 提问，检索功能与数据… 例如：我的课堂分析 / 全校教学质量 / 知识图谱"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={streaming}
            style={{ height: '28px', fontSize: '13px', minWidth: 0 }}
          />
          <button
            className="win-button"
            onClick={() => handleSearch()}
            disabled={streaming || !query.trim()}
            style={{ height: '28px', padding: '0 14px', fontWeight: 'bold', minWidth: '60px', flexShrink: 0 }}
          >
            检索
          </button>
        </div>

        <div className="flex flex-wrap gap-1" style={{ marginTop: '6px' }}>
          {chips.map((chip) => (
            <button
              key={chip}
              className="win-button"
              style={{ fontSize: '10px', padding: '1px 6px' }}
              onClick={() => handleSearch(chip)}
              disabled={streaming}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* —— Agent 检索结果流 —— 固定高 96px + 内部 overflow —— */}
      <div className="win-fieldset" style={{ ...fieldsetStyle, flexShrink: 0, height: '120px' }}>
        <legend>🎯 Agent 检索结果</legend>
        <div
          className="win-sunken"
          style={{ ...scrollStyle, padding: '4px 6px', fontSize: '11px', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '3px' }}
        >
          {chunks.length === 0 && !streaming && (
            <div className="win-text" style={{ color: '#808080', fontStyle: 'italic' }}>▌ 在上方输入或点击建议 chip，让 Agent 为你检索功能与数据</div>
          )}
          {chunks.length === 0 && streaming && (
            <div className="win-text animate-blink" style={{ color: '#808080', fontStyle: 'italic' }}>▌ AI Agent 正在检索…</div>
          )}
          {chunks.map((c, i) => {
            if (c.type === 'nav_result' && c.appId) {
              return (
                <button
                  key={i}
                  className="win-raised flex items-center gap-2 text-left"
                  style={{
                    background: CHUNK_STYLE.nav_result.bg,
                    border: `1px solid ${CHUNK_STYLE.nav_result.border}`,
                    padding: '3px 6px',
                    minWidth: 0,
                  }}
                  onClick={() => openApp(c.appId!)}
                  title={`打开 ${c.appName}`}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{c.appIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="win-text win-text-bold" style={{ fontSize: '12px' }}>{c.appName}</div>
                    <div className="win-text" style={{ fontSize: '10px', color: '#404040', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.content}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#000080', fontWeight: 'bold', flexShrink: 0 }}>打开 →</span>
                </button>
              );
            }
            const st = CHUNK_STYLE[c.type];
            return (
              <div
                key={i}
                className="flex items-start gap-1"
                style={{ background: st.bg, border: `1px solid ${st.border}`, padding: '2px 6px' }}
              >
                <span style={{ flexShrink: 0 }}>{st.icon}</span>
                {c.severity === 'critical' && <span style={{ flexShrink: 0 }}>🔴</span>}
                {c.severity === 'warning' && <span style={{ flexShrink: 0 }}>🟡</span>}
                <span className="win-text" style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{c.content}</span>
              </div>
            );
          })}
          {streaming && chunks.length > 0 && <span className="animate-blink">▌</span>}
        </div>
      </div>

      {/* —— 功能网格 + 数据卡片 —— flex:1 min-height:0 行容器 —— */}
      <div
        style={{
          flex: isMobile ? '0 0 auto' : '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '6px',
          overflow: 'hidden',
        }}
      >
        {/* 功能入口 —— flex 60% */}
        <div className="win-fieldset" style={{ ...fieldsetStyle, flex: isMobile ? undefined : '6 1 0', maxWidth: isMobile ? 'none' : '62%' }}>
          <legend>🗂️ 功能入口</legend>
          <div
            style={{ ...scrollStyle, padding: '4px' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
                gap: '4px',
              }}
            >
              {ctx.apps.map((app) => (
                <button
                  key={app.id}
                  className="win-raised"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    padding: '6px 4px',
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                  title={app.description}
                  onClick={() => openApp(app.id)}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{app.icon}</span>
                  <span className="win-text" style={{ fontSize: '11px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{app.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 数据概览 —— flex 40% */}
        <div className="win-fieldset" style={{ ...fieldsetStyle, flex: isMobile ? undefined : '4 1 0', minWidth: isMobile ? '0' : '240px' }}>
          <legend>📊 数据概览</legend>
          <div style={{ ...scrollStyle, padding: '4px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
              }}
            >
              {ctx.summary.cards.map((card, i) => (
                <button
                  key={i}
                  onClick={() => card.refAppId && openApp(card.refAppId)}
                  title={card.refAppId ? `点击打开 ${findApp(card.refAppId)?.name ?? card.refAppId}` : undefined}
                  style={{
                    display: 'block',
                    width: '100%',
                    minWidth: 0,
                    padding: 0,
                    margin: 0,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: card.refAppId ? 'pointer' : 'default',
                  }}
                >
                  <StatCard label={card.label} value={card.value} hint={card.hint} trend={card.trend} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* —— 底部快捷导航行 —— 自动撑高，单行 —— */}
      <div
        className="win-fieldset"
        style={{ ...fieldsetStyle, flexShrink: 0, height: 'auto' }}
      >
        <legend>⚡ 快捷入口</legend>
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            padding: '4px 6px 6px',
            alignItems: 'center',
          }}
        >
          {quickNav.map((entry) => (
            <button
              key={entry.appId}
              className="win-button flex items-center gap-1"
              style={{ fontSize: '11px', padding: '2px 8px', flexShrink: 0 }}
              onClick={() => openApp(entry.appId)}
              title={entry.reason}
            >
              <span style={{ fontSize: '13px' }}>{entry.icon}</span>
              <span>{entry.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
