import { useAuthStore } from './stores/authStore';
import BootScreen from './shell/BootScreen';
import LoginDialog from './shell/LoginDialog';
import Desktop from './shell/Desktop';
import Taskbar from './shell/Taskbar';
import WindowManager from './shell/WindowManager';

export default function App() {
  const stage = useAuthStore((s) => s.stage);
  const user = useAuthStore((s) => s.user);

  if (stage === 'boot') {
    return <BootScreen />;
  }

  if (stage === 'login' || !user) {
    return <LoginDialog />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Desktop />
      <WindowManager />
      <Taskbar />
    </div>
  );
}
