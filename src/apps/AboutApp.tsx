export default function AboutApp() {
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3 overflow-auto">
      <div className="flex items-center gap-4">
        <div className="grid grid-cols-2 grid-rows-2 gap-[2px]" style={{ width: '48px', height: '48px' }}>
          <div className="bg-[#ff0000]" />
          <div className="bg-[#00aa00]" />
          <div className="bg-[#0000ff]" />
          <div className="bg-[#ffff00]" />
        </div>
        <div>
          <div className="win-text win-text-bold" style={{ fontSize: '18px' }}>
            VLM 课堂分析系统
          </div>
          <div className="win-text" style={{ fontSize: '12px' }}>
            Windows 95 Nostalgia OS Edition · v0.1.0 (Build 1995)
          </div>
        </div>
      </div>

      <div className="win-sunken p-3">
        <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.6' }}>
          一套基于 VLM（视觉语言大模型）的课堂分析平台 Demo。本系统以"桌面操作系统"拟态形式承载课堂分析功能，
          通过预制剧本与虚拟画面模拟 Qwen-VLM 等多模态大模型的实时分析能力，
          旨在替代传统多管线课堂录播方案（ASR→CV→NLP→Rules）。
        </div>
      </div>

      <div className="win-fieldset">
        <legend>核心能力</legend>
        <ul className="win-text" style={{ fontSize: '12px', lineHeight: '1.8', listStyle: 'disc', paddingLeft: '20px' }}>
          <li>5 个场景演示：普通教室 / 体育课 / 实验室 / 实训车间 / 微课录制</li>
          <li>解耦的 VLM 编排 Harness（Mock 预制剧本 + 增量流式 + adapter 预留）</li>
          <li>教师/学生双角色登录分离</li>
          <li>学生个体观察维度（教师视角）+ 我的视角（学生视角）</li>
          <li>实时分析 + 回放分析 + 报告生成 + 教师画像/学生学情档案</li>
          <li>知识 WIKI + AI 学习助手（脚本驱动）</li>
        </ul>
      </div>

      <div className="win-fieldset">
        <legend>架构</legend>
        <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.6' }}>
          Shell 层（Win95 桌面）→ Apps 层（场景/报告/档案/WIKI）→ Harness 层（VLMProvider 接口 + Mock 实现 + 真实 adapter 预留）→ Data 层（LocalStorage）
        </div>
      </div>

      <div className="win-text-disabled text-center" style={{ fontSize: '11px', marginTop: '8px' }}>
        © 1995-2026 VLM Systems Inc. · 仅供演示
      </div>
    </div>
  );
}
