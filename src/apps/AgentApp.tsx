import { useState } from 'react';
import AgentChatPanel from '../components/AgentChatPanel';
import type { ScenarioType } from '../harness/types';

const SCENARIO_OPTIONS: { id: ScenarioType; label: string; icon: string }[] = [
  { id: 'classroom', label: '高一物理·牛顿第二定律', icon: '🏫' },
  { id: 'pe', label: '高二体育·篮球运球', icon: '⚽' },
  { id: 'lab', label: '高二化学·酸碱中和滴定', icon: '🔬' },
  { id: 'workshop', label: '实训车间·普通车削', icon: '🏭' },
  { id: 'microlesson', label: '高三数学·函数单调性', icon: '🎥' },
];

/**
 * AI 助理应用 — Agent 编排内核的全屏深度工作台。
 *
 * 与 PortalApp 的关系：
 * - PortalApp = 登录后英雄窗口，轻量意图分流（导航检索 + 单次 Agent 任务）
 * - AgentApp（本应用）= 全屏深度工作台，支持多轮对话 + 场景切换 + 长任务持续追踪
 *
 * 顶部选择课堂场景（作为 Agent 上下文），主体为 AgentChatPanel。
 */
export default function AgentApp() {
  const [scenario, setScenario] = useState<ScenarioType>('classroom');
  return (
    <div className="flex flex-col h-full bg-win-gray">
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold shrink-0">🤖 AI 助理</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="shrink-0">课堂场景:</span>
        <select
          className="win-input shrink-0"
          value={scenario}
          onChange={(e) => setScenario(e.target.value as ScenarioType)}
          style={{ fontSize: '11px', padding: '1px 4px' }}
        >
          {SCENARIO_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="win-text-disabled shrink-0">全屏工作台 · 目标→规划→执行→反思</span>
      </div>
      <div className="flex-1 min-h-0 p-1">
        <AgentChatPanel scenario={scenario} />
      </div>
    </div>
  );
}
