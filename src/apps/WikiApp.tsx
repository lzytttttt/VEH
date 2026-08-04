import { useState } from 'react';
import { getScript } from '../harness/MockVLMProvider';
import type { ScenarioType, WikiNode } from '../harness/types';
import WikiTree from '../components/WikiTree';
import ChatAssistant from '../components/ChatAssistant';

interface Props {
  initialScenario?: ScenarioType;
  initialNodeId?: string;
  onSeekClassroom?: (scenario: ScenarioType, t: number) => void;
}

const SCENARIO_OPTIONS: { id: ScenarioType; label: string; icon: string }[] = [
  { id: 'classroom', label: '高一物理·牛顿第二定律', icon: '🏫' },
  { id: 'pe', label: '高二体育·篮球运球', icon: '⚽' },
  { id: 'lab', label: '高二化学·酸碱中和滴定', icon: '🔬' },
  { id: 'workshop', label: '实训车间·普通车削', icon: '🏭' },
  { id: 'microlesson', label: '高三数学·函数单调性', icon: '🎥' },
];

export default function WikiApp({ initialScenario = 'classroom', initialNodeId, onSeekClassroom }: Props) {
  const [scenario, setScenario] = useState<ScenarioType>(initialScenario);
  const script = getScript(scenario);
  const wiki = script.wiki;
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNodeId && script.wiki.nodes.find(n => n.id === initialNodeId) ? initialNodeId : wiki.nodes[0]?.id ?? null
  );
  const selectedNode: WikiNode | null = wiki.nodes.find((n) => n.id === selectedId) ?? null;

  const handleSeek = (t: number) => {
    if (onSeekClassroom) onSeekClassroom(scenario, t);
  };

  const handleScenarioChange = (s: ScenarioType) => {
    setScenario(s);
    const newScript = getScript(s);
    setSelectedId(newScript.wiki.nodes[0]?.id ?? null);
  };

  return (
    <div className="flex flex-col h-full bg-win-gray">
      {/* 顶部场景选择器 */}
      <div className="flex items-center gap-2 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">📖 LLM WIKI</span>
        <span className="text-gray-600">|</span>
        <span>课程场景:</span>
        <select
          className="win-input"
          value={scenario}
          onChange={(e) => handleScenarioChange(e.target.value as ScenarioType)}
          style={{ fontSize: '11px', padding: '1px 4px' }}
        >
          {SCENARIO_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.icon} {o.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="win-text-disabled">{wiki.nodes.length} 节点 / {wiki.assistantScript.length} 问答</span>
      </div>

      {/* 三栏布局 */}
      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        {/* 左：知识树 */}
        <div style={{ width: '240px' }} className="min-h-0">
          <WikiTree nodes={wiki.nodes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* 中：知识详情 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {selectedNode ? (
            <NodeDetail node={selectedNode} allNodes={wiki.nodes} onSelectNode={setSelectedId} />
          ) : (
            <div className="win-sunken p-3 text-gray-500 italic" style={{ fontSize: '12px' }}>
              ▌未选择知识点
            </div>
          )}
        </div>

        {/* 右：AI 助手 */}
        <div style={{ width: '300px' }} className="min-h-0">
          <ChatAssistant
            script={wiki.assistantScript}
            currentNode={selectedNode}
            onSeekClassroom={handleSeek}
          />
        </div>
      </div>
    </div>
  );
}

function NodeDetail({
  node,
  allNodes,
  onSelectNode,
}: {
  node: WikiNode;
  allNodes: WikiNode[];
  onSelectNode: (id: string) => void;
}) {
  const related = node.related
    .map((id) => allNodes.find((n) => n.id === id))
    .filter((n): n is WikiNode => Boolean(n));

  return (
    <div className="win-sunken bg-white p-3 h-full overflow-auto" style={{ fontSize: '12px', lineHeight: '1.6' }}>
      <div className="text-gray-500" style={{ fontSize: '11px' }}>{node.category}</div>
      <h2 className="win-text-bold mb-2" style={{ fontSize: '16px', color: '#000080' }}>
        {node.title}
      </h2>

      <div className="win-fieldset">
        <legend>摘要</legend>
        <div>{node.summary}</div>
      </div>

      <div className="win-fieldset" style={{ marginTop: '8px' }}>
        <legend>详细内容</legend>
        <div className="whitespace-pre-wrap">{node.details}</div>
      </div>

      {/* 课堂引用 */}
      {node.classroomRefs.length > 0 && (
        <div className="win-fieldset" style={{ marginTop: '8px' }}>
          <legend>课堂引用片段 ({node.classroomRefs.length})</legend>
          <ul className="list-disc pl-5" style={{ fontSize: '11px' }}>
            {node.classroomRefs.map((ref, i) => (
              <li key={i}>
                <span className="text-gray-500">[{Math.floor(ref.t / 60)}:{(ref.t % 60).toString().padStart(2, '0')}]</span>{' '}
                <span className="win-text-bold">{ref.type}:</span> {ref.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 关联知识点 */}
      {related.length > 0 && (
        <div className="win-fieldset" style={{ marginTop: '8px' }}>
          <legend>关联知识点 ({related.length})</legend>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <button
                key={r.id}
                className="win-button"
                style={{ fontSize: '11px', padding: '2px 8px' }}
                onClick={() => onSelectNode(r.id)}
              >
                🔗 {r.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 知识图谱占位 */}
      <div className="win-fieldset" style={{ marginTop: '8px' }}>
        <legend>知识图谱</legend>
        <svg width="100%" height="120" viewBox="0 0 400 120">
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#808080" />
            </marker>
          </defs>
          {/* 中心节点 */}
          <circle cx="200" cy="60" r="22" fill="#000080" stroke="#fff" strokeWidth="2" />
          <text x="200" y="64" textAnchor="middle" fill="#fff" style={{ fontSize: '9px' }}>{node.title.slice(0, 4)}</text>
          {/* 关联节点 */}
          {related.map((r, i) => {
            const angle = (i / Math.max(related.length, 1)) * Math.PI * 2;
            const x = 200 + Math.cos(angle) * 80;
            const y = 60 + Math.sin(angle) * 40;
            return (
              <g key={r.id}>
                <line x1="200" y1="60" x2={x} y2={y} stroke="#808080" strokeWidth="1" markerEnd="url(#arrow)" />
                <circle cx={x} cy={y} r="14" fill="#008000" stroke="#fff" strokeWidth="1" />
                <text x={x} y={y + 3} textAnchor="middle" fill="#fff" style={{ fontSize: '8px' }}>{r.title.slice(0, 3)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
