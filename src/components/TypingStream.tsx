import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { AnalysisChunk } from '../harness/types';

interface Props {
  /** 当前应渲染的所有 chunk（外部决定可见范围） */
  chunks: AnalysisChunk[];
}

/**
 * 打字机流式文本组件
 *
 * 性能优化：
 * - 直接以外部 chunks 为渲染依据，避免内部 state 同步问题
 * - 长 chunk 列表（>200）仅保留尾部 200 条
 * - 自动滚动到底（仅当用户已在底部时跟随）
 */
export default function TypingStream({ chunks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const visibleChunks = useMemo(() => {
    if (chunks.length <= 200) return chunks;
    return chunks.slice(chunks.length - 200);
  }, [chunks]);

  // 监听滚动判断是否吸底
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    stickRef.current = near;
  };

  useLayoutEffect(() => {
    if (containerRef.current && stickRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleChunks]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="win-sunken p-2 h-full overflow-auto bg-white" style={{ fontSize: '12px', lineHeight: '1.5' }}>
      {visibleChunks.length === 0 && (
        <div className="text-gray-500 italic">▌等待 VLM 分析流接入... 点击底部 ▶ 启动</div>
      )}
      {visibleChunks.map((c, i) => (
        <StreamLine key={`${c.timestamp}-${i}-${c.type}`} chunk={c} />
      ))}
    </div>
  );
}

function StreamLine({ chunk: c }: { chunk: AnalysisChunk }) {
  const ts = `[${Math.floor(c.timestamp / 60).toString().padStart(2, '0')}:${Math.floor(c.timestamp % 60).toString().padStart(2, '0')}]`;
  switch (c.type) {
    case 'event':
      return (
        <div className="my-1 flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span className="px-1" style={{ background: '#ffff80', border: '1px solid #808000', fontSize: '11px' }}>
            🏷️ {c.label || 'event'} {c.confidence ? `(${(c.confidence * 100).toFixed(0)}%)` : ''}
          </span>
          <span className="text-gray-600" style={{ fontSize: '11px' }}>{c.content}</span>
        </div>
      );
    case 'metric':
      return (
        <div className="my-1 flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span className="px-1" style={{ background: '#008080', color: '#fff', fontSize: '11px' }}>
            📊 {c.label}: {c.content}
          </span>
        </div>
      );
    case 'frame_ref':
      return (
        <div className="my-1 flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span className="px-1" style={{ background: '#c0c0c0', fontSize: '11px' }}>
            🎬 {c.label || 'frame'}
          </span>
        </div>
      );
    case 'student':
      return (
        <div className="my-1 flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span className="px-1" style={{ background: '#000080', color: '#fff', fontSize: '11px' }}>
            👤 {c.label || 'student'}
          </span>
          <span style={{ fontSize: '11px' }}>{c.content}</span>
        </div>
      );
    case 'wiki':
      return (
        <div className="my-1 flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span className="px-1" style={{ background: '#008000', color: '#fff', fontSize: '11px' }}>
            📖 wiki
          </span>
          <span style={{ fontSize: '11px', color: '#008000' }}>{c.content}</span>
        </div>
      );
    default:
      return (
        <div className="my-1 flex gap-2">
          <span className="text-gray-400" style={{ fontSize: '10px' }}>{ts}</span>
          <span style={{ fontSize: '12px' }}>{c.content}</span>
        </div>
      );
  }
}
