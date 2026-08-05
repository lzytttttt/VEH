import { useLayoutEffect, useMemo, useRef } from 'react';
import type { GovernanceChunk, GovernanceChunkType } from '../harness/types';

interface Props {
  chunks: GovernanceChunk[];
  loading?: boolean;
}

const CHUNK_STYLE: Record<GovernanceChunkType, { bg: string; border: string; icon: string }> = {
  insight: { bg: '#ffffe0', border: '#808000', icon: '💡' },
  alert: { bg: '#ffe0e0', border: '#FF0000', icon: '⚠️' },
  suggestion: { bg: '#e0ffe0', border: '#008000', icon: '✅' },
  metric_ref: { bg: '#e0e0ff', border: '#000080', icon: '📊' },
};

/**
 * Agent 洞察流式渲染 — 适配 GovernanceChunk
 * 按 chunk 类型着色（insight 黄/alert 红/suggestion 绿/metric_ref 蓝）
 * 自动滚动到底（复用 TypingStream 的吸底逻辑）
 */
export default function AgentInsightStream({ chunks, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const visibleChunks = useMemo(() => (chunks.length <= 200 ? chunks : chunks.slice(chunks.length - 200)), [chunks]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
  };

  useLayoutEffect(() => {
    if (containerRef.current && stickRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleChunks]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="win-sunken p-2 h-full overflow-auto bg-white"
      style={{ fontSize: '11px', lineHeight: '1.5' }}
    >
      {visibleChunks.length === 0 && !loading && (
        <div className="text-gray-500 italic">▌ 等待 AI Agent 治理简报... 点击「生成简报」启动</div>
      )}
      {visibleChunks.length === 0 && loading && (
        <div className="text-gray-500 italic animate-blink">▌ AI Agent 正在分析全校数据...</div>
      )}
      {visibleChunks.map((c, i) => {
        const st = CHUNK_STYLE[c.type];
        return (
          <div
            key={i}
            className="mb-2 px-2 py-1 flex items-start gap-1"
            style={{ background: st.bg, border: `1px solid ${st.border}` }}
          >
            <span style={{ flexShrink: 0 }}>{st.icon}</span>
            {c.severity === 'critical' && <span style={{ flexShrink: 0 }}>🔴</span>}
            {c.severity === 'warning' && <span style={{ flexShrink:  0 }}>🟡</span>}
            <span style={{ flex: 1 }}>{c.content}</span>
          </div>
        );
      })}
      {loading && visibleChunks.length > 0 && <span className="animate-blink">▌</span>}
    </div>
  );
}
