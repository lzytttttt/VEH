import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useWindowStore } from '../stores/windowStore';
import { appsForRole, type AppMeta } from '../apps/registry';
import { launchApp } from '../apps/launcher';
import DesktopIcon from './DesktopIcon';

export default function Desktop() {
  const user = useAuthStore((s) => s.user);
  const openWindow = useWindowStore((s) => s.openWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);

  // 登录进入桌面后自动弹出管理门户；切换角色登录时重建为当前角色内容
  useEffect(() => {
    if (!user) return;
    closeWindow('portal');
    openWindow({
      id: 'portal',
      title: '管理门户',
      icon: '🚪',
      x: 40,
      y: 30,
      width: 880,
      height: 580,
      content: launchApp('portal', user.role),
    });
  }, [user?.id, openWindow, closeWindow]);

  if (!user) return null;
  const apps = appsForRole(user.role);

  const handleOpen = (app: AppMeta) => {
    openWindow({
      id: app.id,
      title: app.name,
      icon: app.icon,
      x: 80 + (apps.indexOf(app) % 4) * 30,
      y: 40 + Math.floor(apps.indexOf(app) / 4) * 100,
      width: app.width,
      height: app.height,
      content: launchApp(app.id, user.role),
    });
  };

  return (
    <div
      className="absolute inset-0 win-desktop-bg"
      style={{ bottom: 'var(--win-taskbar-h)' }}
      onClick={() => {
        // 点击空白处清除选中
      }}
    >
      <div className="grid grid-rows-6 grid-flow-col gap-2 p-3" style={{ width: 'fit-content' }}>
        {apps.map((app) => (
          <DesktopIcon key={app.id} app={app} onOpen={handleOpen} />
        ))}
      </div>
    </div>
  );
}
