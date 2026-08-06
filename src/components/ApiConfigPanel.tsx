import {
  useApiConfigStore,
  PROVIDER_OPTIONS,
  PROVIDER_META,
  VLM_PRESETS,
  type ProviderKey,
  type ProviderConfig,
} from '../stores/apiConfigStore';
import { testChatCompletion } from '../harness/adapters/sseUtils';
import { useState } from 'react';

/**
 * API 接入设置 — Win95 属性表弹窗
 *
 * 核心原则：6 个 Provider 各自独立切换 Mock↔真实 API（指南 §7.1/§7.2/Q5）。
 * 顶部「配置总览」徽章条让每个 Provider 当前模式一目了然；
 * 每个 Provider 分区独立选择类型 + 填写 baseURL/apiKey/model +
 * 「测试连接」按钮（仅 API 模式可用，调一次最小对话返回耗时/响应/错误）。
 *
 * 默认 baseURL 走 Vite dev proxy `/api/llm`（vite.config.ts 中配置转发到 opencode.ai），
 * 避 CORS；生产则把 proxy 改由 Nginx 反向代理（详见 API_INTEGRATION_GUIDE §八 方案 A）。
 */

const PROVIDER_ORDER: ProviderKey[] = [
  'vlm',
  'capability',
  'governance',
  'portal',
  'lessonPlan',
  'slides',
];

function isMock(active: string): boolean {
  return active === 'mock';
}

const inputDisabledStyle = { background: '#C0C0C0', color: '#808080' };

/** 单个 Provider 分区的「测试连接」状态 */
type TestState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; preview: string; elapsedMs: number; url: string }
  | { kind: 'fail'; error: string; elapsedMs: number; url: string };

function TestResultBar({ state, onClose }: { state: TestState; onClose: () => void }) {
  if (state.kind === 'idle') return null;
  if (state.kind === 'running') {
    return (
      <div
        style={{
          marginTop: '4px',
          padding: '4px 6px',
          background: '#C0C0C0',
          border: '1px solid #808080',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ color: '#000080' }}>⏳</span>
        <span>正在测试连接...</span>
      </div>
    );
  }
  const ok = state.kind === 'ok';
  return (
    <div
      style={{
        marginTop: '4px',
        padding: '4px 6px',
        background: ok ? '#E0FFE0' : '#FFE0E0',
        border: `1px solid ${ok ? '#008000' : '#FF0000'}`,
        fontSize: '11px',
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
      }}
    >
      <span style={{ color: ok ? '#008000' : '#FF0000', flexShrink: 0 }}>
        {ok ? '✓' : '✗'}
      </span>
      <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
        <div style={{ fontWeight: 'bold', color: ok ? '#008000' : '#FF0000' }}>
          {ok ? `连接成功 · 耗时 ${state.elapsedMs.toFixed(0)} ms` : `连接失败 · 耗时 ${state.elapsedMs.toFixed(0)} ms`}
        </div>
        <div style={{ marginTop: '2px', color: '#000080', wordBreak: 'break-all' }}>
          URL：{state.url}
        </div>
        <div style={{ marginTop: '2px', color: '#000' }}>
          {ok ? `响应：${state.preview || '（空内容）'}` : `错误：${state.error}`}
        </div>
      </div>
      <button
        className="win-button"
        onClick={onClose}
        title="关闭"
        style={{ minWidth: '20px', padding: '0 4px', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

function ProviderSection({ providerKey }: { providerKey: ProviderKey }) {
  const config = useApiConfigStore((s) => s.configs[providerKey]);
  const setProvider = useApiConfigStore((s) => s.setProvider);
  const meta = PROVIDER_META[providerKey];
  const options = PROVIDER_OPTIONS[providerKey];
  const disabled = isMock(config.active);
  const [testState, setTestState] = useState<TestState>({ kind: 'idle' });
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);

  const handleActiveChange = (active: string) => {
    if (providerKey === 'vlm' && VLM_PRESETS[active]) {
      setProvider(providerKey, { active, ...VLM_PRESETS[active] });
    } else {
      setProvider(providerKey, { active });
    }
    setTestState({ kind: 'idle' });
  };

  const handleTest = async () => {
    if (testState.kind === 'running') return;
    const controller = new AbortController();
    setAbortCtrl(controller);
    setTestState({ kind: 'running' });
    const result = await testChatCompletion({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      model: config.model,
      signal: controller.signal,
    });
    setAbortCtrl(null);
    if (controller.signal.aborted) return;
    if (result.ok) {
      setTestState({ kind: 'ok', preview: result.preview, elapsedMs: result.elapsedMs, url: result.url });
    } else {
      setTestState({ kind: 'fail', error: result.error, elapsedMs: result.elapsedMs, url: result.url });
    }
  };

  const handleAbort = () => {
    abortCtrl?.abort();
    setAbortCtrl(null);
  };

  return (
    <fieldset className="win-fieldset" id={`sec-${providerKey}`}>
      <legend>
        {meta.title}{' '}
        <span style={{ color: '#808080', fontSize: '11px', fontWeight: 'normal' }}>
          {meta.modelType}
        </span>
      </legend>
      <div className="win-text" style={{ fontSize: '11px', color: '#008080', marginBottom: '4px' }}>
        {meta.desc}
      </div>

      {/* Provider 类型单选 — 独立切换 */}
      <div className="flex flex-wrap gap-3" style={{ marginBottom: '6px' }}>
        {options.map((opt) => (
          <label
            key={opt.id}
            className="win-text flex items-center gap-1"
            style={{ fontSize: '12px', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name={`active-${providerKey}`}
              checked={config.active === opt.id}
              onChange={() => handleActiveChange(opt.id)}
              style={{ cursor: 'pointer' }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* baseURL / apiKey / model — Mock 时置灰禁用 */}
      <div className="flex flex-col gap-1">
        <label className="win-text flex items-center gap-2" style={{ fontSize: '12px' }}>
          <span style={{ width: '70px', flexShrink: 0 }}>Base URL</span>
          <input
            className="win-input flex-1"
            value={config.baseURL}
            disabled={disabled}
            style={disabled ? inputDisabledStyle : undefined}
            onChange={(e) => setProvider(providerKey, { baseURL: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </label>
        <label className="win-text flex items-center gap-2" style={{ fontSize: '12px' }}>
          <span style={{ width: '70px', flexShrink: 0 }}>API Key</span>
          <input
            className="win-input flex-1"
            type="password"
            value={config.apiKey}
            disabled={disabled}
            style={disabled ? inputDisabledStyle : undefined}
            onChange={(e) => setProvider(providerKey, { apiKey: e.target.value })}
            placeholder="sk-..."
          />
        </label>
        <label className="win-text flex items-center gap-2" style={{ fontSize: '12px' }}>
          <span style={{ width: '70px', flexShrink: 0 }}>Model</span>
          <input
            className="win-input flex-1"
            value={config.model}
            disabled={disabled}
            style={disabled ? inputDisabledStyle : undefined}
            onChange={(e) => setProvider(providerKey, { model: e.target.value })}
            placeholder="gpt-4o"
          />
        </label>
      </div>

      {/* 测试连接 — Mock 时禁用 */}
      <div className="flex items-center gap-2" style={{ marginTop: '6px' }}>
        <button
          className="win-button"
          disabled={disabled || testState.kind === 'running'}
          style={{
            minWidth: '90px',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onClick={handleTest}
          title="调用配置的端点做一次最小请求，验证 baseURL/apiKey/model 是否可达"
        >
          {testState.kind === 'running' ? '测试中...' : '🔌 测试连接'}
        </button>
        {testState.kind === 'running' && (
          <button
            className="win-button"
            onClick={handleAbort}
            style={{ minWidth: '60px', fontSize: '11px' }}
          >
            取消
          </button>
        )}
        <span className="win-text" style={{ fontSize: '10px', color: '#808080' }}>
          {disabled ? 'Mock 模式无需测试' : '发送一条最小对话验证可达性'}
        </span>
      </div>
      <TestResultBar state={testState} onClose={() => setTestState({ kind: 'idle' })} />
    </fieldset>
  );
}

export default function ApiConfigPanel({ onClose }: { onClose: () => void }) {
  const configs = useApiConfigStore((s) => s.configs);
  const resetToDefaults = useApiConfigStore((s) => s.resetToDefaults);

  const scrollTo = (key: ProviderKey) => {
    document
      .getElementById(`sec-${key}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.3)', zIndex: 60 }}
    >
      <div className="win-window flex flex-col" style={{ width: '560px', maxHeight: '86vh' }}>
        {/* 标题栏 */}
        <div className="win-titlebar" style={{ cursor: 'default' }}>
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: '12px' }}>⚙</span>
            <span>API 接入设置</span>
          </div>
          <button className="win-titlebar-btn" title="关闭" onClick={onClose}>
            <span className="win-glyph win-glyph-close" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-3 flex flex-col gap-2 overflow-auto" style={{ marginTop: '2px' }}>
          {/* 安全警告条 */}
          <div
            style={{
              background: '#FFFF80',
              color: '#000',
              fontSize: '11px',
              padding: '4px 6px',
              border: '1px solid #808080',
              lineHeight: '1.4',
            }}
          >
            ⚠ 安全提示：API Key 存于浏览器 localStorage，仅限本地调试。生产环境须由后端代理注入
            Key，前端走 /api/llm/*，切勿将 Key 打进构建产物。
          </div>

          {/* 配置总览徽章条 — 6 Provider 当前模式一目了然 */}
          <div className="win-fieldset" style={{ marginTop: '2px' }}>
            <legend>配置总览（点击定位）</legend>
            <div className="flex flex-wrap gap-2">
              {PROVIDER_ORDER.map((key) => {
                const mock = isMock(configs[key].active);
                return (
                  <button
                    key={key}
                    onClick={() => scrollTo(key)}
                    title={`定位到 ${PROVIDER_META[key].title}`}
                    style={{
                      fontSize: '11px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      border: '1px solid #808080',
                      background: '#C0C0C0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        background: mock ? '#808080' : '#008000',
                        display: 'inline-block',
                      }}
                    />
                    <span className="win-text">{PROVIDER_META[key].title}</span>
                    <span style={{ color: mock ? '#808080' : '#008000', fontWeight: 'bold' }}>
                      {mock ? 'Mock' : 'API'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 个 Provider 独立分区 */}
          {PROVIDER_ORDER.map((key) => (
            <ProviderSection key={key} providerKey={key} />
          ))}
        </div>

        {/* 底部按钮栏 */}
        <div
          className="flex items-center justify-between gap-2 p-3"
          style={{ borderTop: '1px solid #808080' }}
        >
          <button
            className="win-button"
            onClick={resetToDefaults}
            style={{ minWidth: '100px' }}
            title="将全部 6 个 Provider 恢复为 Mock 默认"
          >
            恢复默认
          </button>
          <button
            className="win-button is-default"
            onClick={onClose}
            style={{ minWidth: '90px', fontWeight: 'bold' }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
