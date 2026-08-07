import { useAuthStore } from '../../stores/authStore';
import { useWindowStore } from '../../stores/windowStore';
import { appsForRole, type AppMeta } from '../../apps/registry';
import { launchApp } from '../../apps/launcher';

const ROLE_LABEL: Record<string, string> = {
  teacher: '教师',
  student: '学生',
  admin: '管理',
};

const ROLE_LETTER: Record<string, string> = {
  teacher: 'T',
  student: 'S',
  admin: 'A',
};

/**
 * 移动端 App 抽屉 —— 替代桌面端的 Desktop 图标网格 + StartMenu。
 * 单击打开应用（非双击），4 列图标网格，72px 触控目标。
 * 顶部用户信息栏 + 应用分类标签。
 */
export default function MobileHomeScreen() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const openWindow = useWindowStore((s) => s.openWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const windows = useWindowStore((s) => s.windows);

  const apps = appsForRole(user.role);

  const handleOpen = (app: AppMeta) => {
    const existing = windows.find((w) => w.id === app.id);
    if (existing) {
      restoreWindow(app.id);
      return;
    }
    openWindow({
      id: app.id,
      title: app.name,
      icon: app.icon,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      content: launchApp(app.id, user.role),
    });
  };

  const categories: { label: string; keys: string[] }[] = [
    { label: '场景分析', keys: ['scenario'] },
    { label: '报告与档案', keys: ['report', 'profile'] },
    { label: '知识模块', keys: ['wiki'] },
    { label: '能力提升', keys: ['capability'] },
    { label: '教学工具', keys: ['teaching'] },
    { label: '学校治理', keys: ['governance'] },
    { label: '系统', keys: ['system'] },
  ];

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* 顶部用户信息栏 */}
      <div
        className="win-raised flex items-center gap-3"
        style={{ padding: '10px 12px', margin: '8px', minHeight: '52px' }}
      >
        <div
          className="flex items-center justify-center text-white shrink-0"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: user.avatarColor,
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          {ROLE_LETTER[user.role]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="win-text win-text-bold truncate" style={{ fontSize: '14px' }}>
            {user.name}
          </div>
          <div className="win-text truncate" style={{ fontSize: '11px', color: '#008080' }}>
            {ROLE_LABEL[user.role]} · {user.title}
          </div>
        </div>
        <button
          className="win-button shrink-0"
          onClick={logout}
          style={{ minHeight: '36px', padding: '4px 12px', fontSize: '12px' }}
        >
          注销
        </button>
      </div>

      {/* 应用网格 —— 按分类分组 */}
      {categories.map((cat) => {
        const catApps = apps.filter((a) => cat.keys.includes(a.category));
        if (catApps.length === 0) return null;
        return (
          <div key={cat.label} style={{ padding: '0 8px 8px' }}>
            <div
              className="win-text win-text-bold"
              style={{ fontSize: '11px', color: '#ffff80', padding: '4px 4px 6px', textShadow: '1px 1px #000' }}
            >
              {cat.label}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              {catApps.map((app) => {
                const isOpen = windows.some((w) => w.id === app.id);
                return (
                  <button
                    key={app.id}
                    onClick={() => handleOpen(app)}
                    className="flex flex-col items-center"
                    style={{ padding: '8px 2px', gap: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        width: '48px',
                        height: '48px',
                        fontSize: '32px',
                        lineHeight: 1,
                        imageRendering: 'pixelated',
                        filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.6))',
                      }}
                    >
                      {app.icon}
                      {isOpen && (
                        <span
                          className="absolute"
                          style={{
                            bottom: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#00ff00',
                            border: '1px solid #000',
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        color: '#fff',
                        fontSize: '10px',
                        lineHeight: 1.15,
                        textShadow: '1px 1px #000',
                        wordBreak: 'break-all',
                        maxHeight: '2.3em',
                        overflow: 'hidden',
                      }}
                    >
                      {app.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ height: '60px' }} />
    </div>
  );
}
