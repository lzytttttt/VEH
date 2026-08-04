import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useWindowStore } from '../stores/windowStore';
import StartMenu from './StartMenu';

/** Win95 四色旗帜（开始按钮/开始菜单通用） */
export function WinFlag({ size = 14 }: { size?: number }) {
  const cell = Math.floor(size / 2);
  return (
    <span
      className="inline-grid shrink-0"
      style={{
        gridTemplateColumns: `${cell}px ${cell}px`,
        gridTemplateRows: `${cell}px ${cell}px`,
        gap: '1px',
        transform: 'skewY(-4deg)',
      }}
    >
      <i style={{ background: '#ff0000' }} />
      <i style={{ background: '#00c000' }} />
      <i style={{ background: '#0000ff' }} />
      <i style={{ background: '#ffff00' }} />
    </span>
  );
}

export default function Taskbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const getActiveId = useWindowStore((s) => s.getActiveId);
  const [startOpen, setStartOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeId = getActiveId();
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <>
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} onLogout={logout} />}

      <div
        className="flex items-center"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--win-taskbar-h)',
          zIndex: 9999,
          background: 'var(--win-gray)',
          boxShadow: 'inset 0 1px var(--win-btn-light), inset 0 2px var(--win-btn-highlight)',
          padding: '4px 3px 3px',
          gap: '3px',
        }}
      >
        {/* Start 按钮 */}
        <button
          className={`win-button flex items-center ${startOpen ? 'is-pressed' : ''}`}
          style={{ minWidth: 'auto', height: '26px', padding: '2px 8px 2px 5px', gap: '5px', fontWeight: 'bold' }}
          onClick={(e) => {
            e.stopPropagation();
            setStartOpen((v) => !v);
          }}
        >
          <WinFlag size={15} />
          <span>开始</span>
        </button>

        <div className="win-separator-v" style={{ height: '22px', margin: '0 2px' }} />

        {/* 运行中应用 */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {windows.map((w) => (
            <button
              key={w.id}
              className={`win-taskbar-btn ${activeId === w.id && !w.minimized ? 'is-active' : ''}`}
              onClick={() => (w.minimized ? restoreWindow(w.id) : focusWindow(w.id))}
              title={w.title}
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>{w.icon}</span>
              <span className="truncate">{w.title}</span>
            </button>
          ))}
        </div>

        {/* 系统托盘 */}
        <div
          className="win-sunken-thin flex items-center"
          style={{ height: '26px', padding: '0 8px', gap: '7px' }}
          title={`${dateStr}\n${user?.name} · ${user?.title}`}
        >
          <span style={{ fontSize: '12px', lineHeight: 1 }}>🔊</span>
          <span
            className="flex items-center justify-center text-white"
            style={{
              width: '16px',
              height: '16px',
              background: user?.avatarColor,
              fontSize: '10px',
              fontWeight: 'bold',
              boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
            }}
          >
            {user?.role === 'teacher' ? 'T' : 'S'}
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--win-font-mono)', letterSpacing: '0.5px' }}>
            {timeStr}
          </span>
        </div>
      </div>
    </>
  );
}
