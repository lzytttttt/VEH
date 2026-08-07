import { useEffect, useState } from 'react';
import { getCapabilityProvider } from '../harness/providerRegistry';
import type { ScenarioType, WikiContainer, WikiNode } from '../harness/types';
import { useApiConfigStore } from '../stores/apiConfigStore';
import WikiTree from '../components/WikiTree';
import ChatAssistant from '../components/ChatAssistant';
import KnowledgeGraph from '../components/KnowledgeGraph';
import MobileTabBar from '../components/MobileTabBar';
import { useIsMobile } from '../lib/useIsMobile';

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
  const [wiki, setWiki] = useState<WikiContainer | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState('tree');
  // capability active='api' 时，ChatAssistant 走真 LLM；否则关键词匹配
  const useLLM = useApiConfigStore((s) => s.configs.capability.active) === 'api';

  // 经 CapabilityProvider 异步加载 wiki（Mock 等价于原 getScript，adapter 预留真实模型 API）
  useEffect(() => {
    let cancelled = false;
    setWiki(null);
    getCapabilityProvider()
      .getWiki(scenario)
      .then((w) => {
        if (cancelled) return;
        setWiki(w);
        const init =
          initialNodeId && w.nodes.find((n) => n.id === initialNodeId)
            ? initialNodeId
            : w.nodes[0]?.id ?? null;
        setSelectedId(init);
      })
      .catch((e) => {
        console.error('WikiApp load wiki failed', e);
      });
    return () => {
      cancelled = true;
    };
    // 场景切换即重新加载；initialNodeId 仅作首屏定位
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const handleSeek = (t: number) => {
    if (onSeekClassroom) onSeekClassroom(scenario, t);
  };

  const handleScenarioChange = (s: ScenarioType) => {
    setScenario(s);
  };

  const nodes = wiki?.nodes ?? [];
  const selectedNode: WikiNode | null = nodes.find((n) => n.id === selectedId) ?? null;

  if (!wiki) {
    return (
      <div className="flex items-center justify-center h-full bg-win-gray win-sunken" style={{ fontSize: '12px' }}>
        <span className="win-text-disabled animate-blink">▌ 正在加载知识 WIKI...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-win-gray">
      {/* 顶部场景选择器 */}
      <div className="flex items-center gap-2 px-2 py-1 overflow-x-auto" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080', scrollbarWidth: 'none' }}>
        <span className="win-text-bold shrink-0">📖 LLM WIKI</span>
        <span className="text-gray-600 shrink-0">|</span>
        <span className="shrink-0">课程场景:</span>
        <select
          className="win-input shrink-0"
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
        <span className="win-text-disabled shrink-0">{wiki.nodes.length} 节点 / {wiki.assistantScript.length} 问答</span>
      </div>

      {/* 主内容区 —— 移动端 Tab 切换 / 桌面端三栏 */}
      {isMobile ? (
        <>
          <MobileTabBar
            tabs={[
              { id: 'tree', label: '知识树', icon: '🌳' },
              { id: 'detail', label: '详情', icon: '📖' },
              { id: 'assistant', label: '助手', icon: '🤖' },
            ]}
            activeId={mobileTab}
            onChange={setMobileTab}
          />
          <div className="flex-1 min-h-0 overflow-hidden p-1">
            {mobileTab === 'tree' && (
              <div className="h-full min-h-0">
                <WikiTree nodes={wiki.nodes} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            )}
            {mobileTab === 'detail' && (
              <div className="h-full min-h-0 overflow-auto">
                {selectedNode ? (
                  <NodeDetail node={selectedNode} allNodes={wiki.nodes} onSelectNode={setSelectedId} />
                ) : (
                  <div className="win-sunken p-3 text-gray-500 italic" style={{ fontSize: '12px' }}>
                    ▌未选择知识点
                  </div>
                )}
              </div>
            )}
            {mobileTab === 'assistant' && (
              <div className="h-full min-h-0">
                <ChatAssistant script={wiki.assistantScript} currentNode={selectedNode} allNodes={wiki.nodes} useLLM={useLLM} onSeekClassroom={handleSeek} />
              </div>
            )}
          </div>
        </>
      ) : (
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
            <ChatAssistant script={wiki.assistantScript} currentNode={selectedNode} allNodes={wiki.nodes} useLLM={useLLM} onSeekClassroom={handleSeek} />
          </div>
        </div>
      )}
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

      {/* 知识图谱（交互式力导向） */}
      <div className="win-fieldset" style={{ marginTop: '8px' }}>
        <legend>知识图谱</legend>
        <KnowledgeGraph node={node} allNodes={allNodes} onSelectNode={onSelectNode} />
      </div>
    </div>
  );
}
