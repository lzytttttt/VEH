import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getProviderConfig } from '../stores/apiConfigStore';

/**
 * App 级 ErrorBoundary
 *
 * 防止 LLM 返回畸形 JSON / Adapter 数据缺字段 / parseBlocks 失控等
 * 任意子树抛错导致整个 WindowManager 白屏 / 卡死。
 *
 * 行为：
 * - 捕获子树的渲染错误与事件回调错误
 * - 显示 Win95 风格错误对话框，显示错误摘要 + "恢复默认（清掉 LLM 配置）+ 刷新"
 * - 用户可点击按钮调用 store.resetToDefaults() 还原 Mock 模式后刷新
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  /** 用户点击「还原 Mock + 刷新」后置 true，阻止重复触发 */
  reset: boolean;
}

function isCrossOriginErrorMessage(msg: string): boolean {
  // 浏览器跨源脚本错误只暴露 "Script error."
  return msg === 'Script error.' || msg === '';
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reset: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 开发态记录到控制台；生产可对接上报
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    try {
      // 用 store 直接调用，不依赖 React hooks 顺序
      // 走 dynamic import 避免循环依赖问题
      import('../stores/apiConfigStore').then((mod) => {
        try {
          mod.useApiConfigStore.getState().resetToDefaults();
        } catch (e) {
          console.error('resetToDefaults failed', e);
        }
        // 重新加载页面，确保 Provider 缓存清空
        window.location.reload();
      });
    } catch (e) {
      console.error('ErrorBoundary handleReset failed', e);
      window.location.reload();
    }
    this.setState({ reset: true });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const crossOrigin = isCrossOriginErrorMessage(error.message);
    const summary = crossOrigin
      ? '渲染异常（跨源脚本错误，无法读取详情）。通常是上游资源加载失败或第三方脚本异常引起。'
      : error.message;

    // 即使是 reset 后，也显示一个静态提示，避免白屏
    if (this.state.reset) {
      return (
        <div className="win-window" style={{ position: 'absolute', top: 80, left: 80, width: 480, padding: '0' }}>
          <div className="win-titlebar">
            <div className="flex items-center gap-[5px]">
              <span style={{ fontSize: '12px' }}>⚠</span>
              <span>正在恢复默认配置…</span>
            </div>
          </div>
          <div className="p-3 win-text" style={{ fontSize: '12px' }}>
            <p>已点击"恢复默认"，页面即将刷新。若长时间未响应，请手动按 F5。</p>
          </div>
        </div>
      );
    }

    return (
      <div className="win-window" style={{ position: 'absolute', top: 80, left: 80, width: 480, padding: '0', zIndex: 9999 }}>
        <div className="win-titlebar">
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: '12px' }}>⚠</span>
            <span>组件渲染异常</span>
          </div>
        </div>
        <div className="p-3 win-text" style={{ fontSize: '12px', lineHeight: 1.6 }}>
          <div className="win-text-bold" style={{ color: '#FF0000', marginBottom: '6px' }}>
            渲染时捕获到未处理错误，已暂停下方组件以避免白屏。
          </div>
          <div
            className="win-sunken"
            style={{
              padding: '6px 8px',
              maxHeight: '120px',
              overflow: 'auto',
              fontFamily: '"Lucida Console", monospace',
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginBottom: '8px',
            }}
          >
            {summary}
          </div>
          <div className="win-text-disabled" style={{ fontSize: '11px', marginBottom: '8px' }}>
            常见原因：LLM 返回 JSON 缺字段（已为教师演练/知识 WIKI 加严校验）、Adapter 渲染失败、localStorage 数据异常。
          </div>
          <div className="flex gap-2">
            <button className="win-button is-default" onClick={this.handleReset} style={{ minWidth: '140px', fontWeight: 'bold' }}>
              🔄 还原 Mock 模式 + 刷新
            </button>
            <button className="win-button" onClick={this.handleReload} style={{ minWidth: '80px' }}>
              仅刷新
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// 导出此函数用于 Provider 内部清除缓存（如 WIKI 加载失败）
export function clearProviderCache(_providerKey?: string): void {
  // 当前项目无 Provider 缓存可清；占位
}
