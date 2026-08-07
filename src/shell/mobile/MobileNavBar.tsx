import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWindowStore } from '../../stores/windowStore';
import { WinFlag } from '../Taskbar';

interface Props {
  activeId: string | null;
}

const ROLE_LETTER: Record<string, string> = {
  teacher: 'T',
  student: 'S',
  admin: 'A',
};

/**
 * 移动端底部导航栏 —— 替代桌面端的 Taskbar。
 * 左侧 Home 按钮（WinFlag → minimizeAll 返回抽屉），
 * 中部运行中应用 Tab 横滑（tap → focusWindow 切换），
 * 右侧用户头像 + 时钟。
 */
export default function MobileNavBar({ activeId }: Props) {
  const user = useAuthStore((s) => s.user);
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeAll = useWindowStore((s) => s.minimizeAll);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div
      className="win-raised-thin flex items-center mobile-safe-bottom"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--win-taskbar-h)',
        zIndex: 9999,
        padding: '4px',
        gap: '4px',
        boxShadow: 'inset 0 1px var(--win-btn-light), inset 0 2px var(--win-btn-highlight)',
      }}
    >
      {/* Home 按钮 */}
      <button
        className={`win-button flex items-center justify-center shrink-0 ${activeId === null ? 'is-pressed' : ''}`}
        onClick={() => minimizeAll()}
        style={{ minWidth: 'auto', width: '44px', height: '36px', padding: '0' }}
        title="返回主屏"
      >
        <WinFlag size={16} />
      </button>

      <div className="win-separator-v shrink-0" style={{ height: '28px', margin: '0 2px' }} />

      {/* 运行中应用 Tab 横滑 */}
      <div
        className="flex-1 flex items-center gap-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none', minHeight: '36px' }}
      >
        {windows.length === 0 && (
          <span className="win-text-disabled" style={{ fontSize: '11px', padding: '0 4px' }}>
            ▌ 已打开的应用将显示在此处
          </span>
        )}
        {windows.map((w) => (
          <button
            key={w.id}
            className={`win-taskbar-btn ${activeId === w.id ? 'is-active' : ''}`}
            onClick={() => focusWindow(w.id)}
            title={w.title}
            style={{ flex: '0 0 auto', maxWidth: '100px' }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>{w.icon}</span>
            <span className="truncate" style={{ fontSize: '11px' }}>{w.title}</span>
          </button>
        ))}
      </div>

      {/* 用户头像 + 时钟 */}
      <div className="win-separator-v shrink-0" style={{ height: '28px', margin: '0 2px' }} />
      <div
        className="win-sunken-thin flex items-center gap-1 shrink-0"
        style={{ height: '32px', padding: '0 6px' }}
      >
        <span
          className="flex items-center justify-center text-white"
          style={{
            width: '20px',
            height: '20px',
            background: user?.avatarColor,
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          {user ? ROLE_LETTER[user.role] : '?'}
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'var(--win-font-mono)', letterSpacing: '0.5px' }}>
          {timeStr}
        </span>
      </div>
    </div>
  );
}
