import type { AppMeta } from './registry';

interface Props {
  app: AppMeta;
}

export default function PlaceholderApp({ app }: Props) {
  return (
    <div className="w-full h-full p-4 overflow-auto">
      <div className="win-fieldset">
        <legend>{app.name} · 模块预览</legend>
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center"
            style={{ width: '48px', height: '48px', fontSize: '32px', background: '#fff', border: '1px solid #808080' }}
          >
            {app.icon}
          </div>
          <div className="flex-1">
            <div className="win-text win-text-bold" style={{ fontSize: '14px' }}>
              {app.name}
            </div>
            <div className="win-text" style={{ fontSize: '12px', marginTop: '4px' }}>
              {app.description}
            </div>
            <div className="win-text-disabled" style={{ fontSize: '12px', marginTop: '6px' }}>
              ▌此模块将在后续 todo 中接入真实组件与 VLM 编排流。
            </div>
          </div>
        </div>
      </div>

      <div className="win-fieldset" style={{ marginTop: '8px' }}>
        <legend>规划要点</legend>
        <ul className="win-text" style={{ fontSize: '12px', lineHeight: '1.8', listStyle: 'disc', paddingLeft: '20px' }}>
          <li>由 ScenarioApp 共享模板渲染，按场景配置差异化</li>
          <li>左侧虚拟画面区 + 右侧流式分析输出 + 底部事件时间线</li>
          <li>支持实时模式（token 流式）/ 回放模式（暂停/倍速）</li>
          <li>教师视角含 StudentPanel 学生个体观察面板</li>
          <li>学生视角含 MyViewPanel "我的视角"面板</li>
          <li>所有数据由 MockVLMProvider 从预制剧本增量流式输出</li>
        </ul>
      </div>

      <div className="win-sunken p-2 mt-2" style={{ fontSize: '11px', color: '#808080' }}>
        当前阶段：Shell 与系统外壳已就绪 · Harness 与应用模块待接入
      </div>
    </div>
  );
}
