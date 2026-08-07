interface MobileTab {
  id: string;
  label: string;
  icon?: string;
}

interface MobileTabBarProps {
  tabs: MobileTab[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * 可复用移动端分段控件（Segmented Control）。
 * Win95 按钮样式，活动态 is-pressed 凹陷。
 * 供所有多栏 App 在移动端切换面板使用。
 * 支持横向滚动以适配超出屏幕宽度的 Tab。
 */
export default function MobileTabBar({ tabs, activeId, onChange }: MobileTabBarProps) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto win-raised-thin"
      style={{
        flexShrink: 0,
        padding: '4px',
        scrollbarWidth: 'none',
        minHeight: '44px',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            className={`win-button flex items-center gap-1 ${active ? 'is-pressed' : ''}`}
            style={{
              flex: '1 0 auto',
              minHeight: '36px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: active ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
            }}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span style={{ fontSize: '14px', lineHeight: 1 }}>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
