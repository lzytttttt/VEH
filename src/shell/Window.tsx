import { useRef, useCallback, type ReactNode } from 'react';
import { useWindowStore, type WindowInstance } from '../stores/windowStore';

interface WindowProps {
  instance: WindowInstance;
  children: ReactNode;
  isActive: boolean;
}

export default function Window({ instance, children, isActive }: WindowProps) {
  const { id, title, icon, x, y, width, height, zIndex, minimized, maximized, closable = true } = instance;
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 仅左键拖拽；最大化时禁止拖动
      if (e.button !== 0 || maximized) return;
      focusWindow(id);
      dragOffset.current = { dx: e.clientX - x, dy: e.clientY - y };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [id, x, y, maximized, focusWindow]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragOffset.current) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.current.dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.dy));
      moveWindow(id, nx, ny);
    },
    [id, moveWindow]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragOffset.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // noop
    }
  }, []);

  if (minimized) return null;

  const frameStyle: React.CSSProperties = maximized
    ? { left: 0, top: 0, width: '100%', height: 'calc(100% - var(--win-taskbar-h))', zIndex }
    : { left: x, top: y, width, height, zIndex };

  return (
    <div
      className="win-window absolute flex flex-col"
      style={frameStyle}
      onPointerDown={() => focusWindow(id)}
    >
      {/* 标题栏（双击切换最大化） */}
      <div
        className={`win-titlebar ${isActive ? '' : 'is-inactive'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => toggleMaximize(id)}
        style={{ touchAction: 'none', cursor: maximized ? 'default' : 'move' }}
      >
        <div className="flex items-center gap-[5px] truncate">
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center" style={{ gap: '2px' }}>
          <button
            className="win-titlebar-btn"
            title="最小化"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(id);
            }}
          >
            <span className="win-glyph win-glyph-min" />
          </button>
          <button
            className="win-titlebar-btn"
            title={maximized ? '还原' : '最大化'}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize(id);
            }}
          >
            <span className={`win-glyph ${maximized ? 'win-glyph-restore' : 'win-glyph-max'}`} />
          </button>
          {closable && (
            <button
              className="win-titlebar-btn"
              title="关闭"
              style={{ marginLeft: '2px' }}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                closeWindow(id);
              }}
            >
              <span className="win-glyph win-glyph-close" />
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden bg-win-gray" style={{ marginTop: '2px' }}>
        {children}
      </div>
    </div>
  );
}
