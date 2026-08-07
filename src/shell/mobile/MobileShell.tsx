import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useWindowStore } from '../../stores/windowStore';
import { launchApp } from '../../apps/launcher';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import MobileHomeScreen from './MobileHomeScreen';
import MobileAppView from './MobileAppView';
import MobileNavBar from './MobileNavBar';

/**
 * 移动端 Shell 容器 —— 从 windowStore.getActiveId() 推导显示哪个视图：
 * - activeId === null（全部最小化或无窗口）→ MobileHomeScreen（App 抽屉）
 * - activeId !== null → MobileAppView（全屏展示活动窗口 content）
 *
 * 底部始终固定 MobileNavBar。登录后自动弹出管理门户（与 Desktop 行为一致）。
 */
export default function MobileShell() {
  const user = useAuthStore((s) => s.user);
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const activeId = useWindowStore((s) => s.getActiveId());

  // 登录进入后自动弹出管理门户（与 Desktop.tsx 行为一致）
  useEffect(() => {
    if (!user) return;
    closeWindow('portal');
    openWindow({
      id: 'portal',
      title: '管理门户',
      icon: '🚪',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      content: launchApp('portal', user.role),
    });
  }, [user?.id, openWindow, closeWindow]);

  if (!user) return null;

  const activeWindow = windows.find((w) => w.id === activeId) ?? null;

  return (
    <div
      className="absolute inset-0 flex flex-col win-desktop-bg mobile-safe-top"
      style={{ overflow: 'hidden', paddingBottom: 'var(--win-taskbar-h)' }}
    >
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeWindow ? (
          <ErrorBoundary>
            <MobileAppView window={activeWindow} />
          </ErrorBoundary>
        ) : (
          <MobileHomeScreen />
        )}
      </div>

      <MobileNavBar activeId={activeId} />
    </div>
  );
}
