import type { WindowInstance } from '../../stores/windowStore';
import { useWindowStore } from '../../stores/windowStore';

interface Props {
  window: WindowInstance;
}

/**
 * 移动端全屏单 App 视图 —— 替代桌面端的 Window + WindowManager。
 * 只渲染活动窗口的 content 全屏，无拖拽、无最小化/最大化按钮。
 * 顶部移动标题栏（app 图标 + 标题 + 关闭按钮，触控友好）。
 */
export default function MobileAppView({ window: win }: Props) {
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const closable = win.closable !== false;

  return (
    <div className="win-window absolute inset-0 flex flex-col" style={{ padding: '3px' }}>
      {/* 移动标题栏 */}
      <div
        className="win-titlebar flex items-center justify-between"
        style={{ minHeight: 'var(--win-titlebar-h)', padding: '0 4px' }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>{win.icon}</span>
          <span className="truncate" style={{ fontSize: '13px' }}>
            {win.title}
          </span>
        </div>
        {closable && (
          <button
            className="win-titlebar-btn shrink-0"
            title="关闭"
            onClick={() => closeWindow(win.id)}
            style={{ width: '28px', height: '24px' }}
          >
            <span className="win-glyph win-glyph-close" />
          </button>
        )}
      </div>

      {/* 内容区 —— 全屏填充 */}
      <div className="flex-1 min-h-0 overflow-hidden bg-win-gray" style={{ marginTop: '2px' }}>
        {win.content}
      </div>
    </div>
  );
}
