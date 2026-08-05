import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useWindowStore } from '../stores/windowStore';
import { appsForRole, type AppMeta } from '../apps/registry';
import { launchApp } from '../apps/launcher';

interface Props {
  onClose: () => void;
  onLogout: () => void;
}

export default function StartMenu({ onClose, onLogout }: Props) {
  const user = useAuthStore((s) => s.user);
  const openWindow = useWindowStore((s) => s.openWindow);

  useEffect(() => {
    const onDocClick = () => onClose();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  if (!user) return null;
  const apps = appsForRole(user.role);

  const handleOpen = (app: AppMeta) => {
    onClose();
    openWindow({
      id: app.id,
      title: app.name,
      icon: app.icon,
      x: 100 + apps.indexOf(app) * 20,
      y: 60,
      width: app.width,
      height: app.height,
      content: launchApp(app.id, user.role),
    });
  };

  const scenarios = apps.filter((a) => a.category === 'scenario');
  const reports = apps.filter((a) => a.category === 'report' || a.category === 'profile' || a.category === 'wiki');
  const system = apps.filter((a) => a.category === 'system');

  return (
    <div
      className="win-menu absolute"
      style={{
        bottom: 'calc(var(--win-taskbar-h) + 2px)',
        left: '2px',
        width: '272px',
        zIndex: 10000,
        boxShadow:
          'inset -1px -1px var(--win-btn-darkshadow), inset 1px 1px var(--win-btn-light), inset -2px -2px var(--win-btn-shadow), inset 2px 2px var(--win-btn-highlight), 3px 3px 0 rgba(0,0,0,0.35)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex" style={{ alignItems: 'stretch' }}>
        {/* 侧边栏 */}
        <div
          className="flex items-end justify-center"
          style={{
            width: '30px',
            padding: '8px 0',
            background: 'linear-gradient(0deg, #000080 0%, #1084d0 100%)',
            color: '#fff',
          }}
        >
          <span
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: '16px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
            }}
          >
            VLM<span style={{ fontWeight: 400 }}>EduHub</span>
            <span style={{ color: '#c0c0c0', fontSize: '13px' }}> 95</span>
          </span>
        </div>

        {/* 菜单列表 */}
        <div className="flex-1 flex flex-col" style={{ padding: '3px' }}>
          <MenuGroup label="场景分析">
            {scenarios.map((a) => (
              <MenuItem key={a.id} icon={a.icon} label={a.name} hint={a.description} onClick={() => handleOpen(a)} />
            ))}
          </MenuGroup>
          <div className="win-menu-separator" />
          <MenuGroup label="报告与档案">
            {reports.map((a) => (
              <MenuItem key={a.id} icon={a.icon} label={a.name} hint={a.description} onClick={() => handleOpen(a)} />
            ))}
          </MenuGroup>
          <div className="win-menu-separator" />
          <MenuGroup label="能力提升">
            {apps.filter((a) => a.category === 'capability').map((a) => (
              <MenuItem key={a.id} icon={a.icon} label={a.name} hint={a.description} onClick={() => handleOpen(a)} />
            ))}
          </MenuGroup>
          <div className="win-menu-separator" />
          <MenuGroup label="系统">
            {system.map((a) => (
              <MenuItem key={a.id} icon={a.icon} label={a.name} hint={a.description} onClick={() => handleOpen(a)} />
            ))}
          </MenuGroup>
          <div className="win-menu-separator" />
          <MenuItem icon="🚪" label="注销(L)..." onClick={() => { onClose(); onLogout(); }} />
          <MenuItem icon="🔌" label="关闭系统(U)..." onClick={() => { onClose(); onLogout(); }} />
        </div>
      </div>
    </div>
  );
}

function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="win-text-disabled" style={{ fontSize: '11px', padding: '2px 8px 1px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function MenuItem({ icon, label, hint, onClick }: { icon: string; label: string; hint?: string; onClick: () => void }) {
  return (
    <button className="win-menu-item" title={hint} onClick={onClick}>
      <span style={{ fontSize: '15px', lineHeight: 1, width: '20px', textAlign: 'center' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
