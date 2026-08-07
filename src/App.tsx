import { useAuthStore } from './stores/authStore';
import { useIsMobile } from './lib/useIsMobile';
import BootScreen from './shell/BootScreen';
import LoginDialog from './shell/LoginDialog';
import Desktop from './shell/Desktop';
import Taskbar from './shell/Taskbar';
import WindowManager from './shell/WindowManager';
import MobileShell from './shell/mobile/MobileShell';

export default function App() {
  const stage = useAuthStore((s) => s.stage);
  const user = useAuthStore((s) => s.user);
  const isMobile = useIsMobile();

  if (stage === 'boot') {
    return <BootScreen />;
  }

  if (stage === 'login' || !user) {
    return <LoginDialog />;
  }

  // 移动端：渲染移动原生 Shell（App 抽屉 + 全屏单 App + 底部导航）
  if (isMobile) {
    return <MobileShell />;
  }

  // 桌面端：保持原有 Desktop + WindowManager + Taskbar 不变
  return (
    <div className="relative w-full h-full overflow-hidden">
      <Desktop />
      <WindowManager />
      <Taskbar />
    </div>
  );
}
