import type { AgentEvent } from '../harness/agent';

/** 把工具结果格式化为可读预览（避免大 JSON 撑爆界面） */
export function previewResult(result: unknown): string {
  if (!result || typeof result !== 'object') return String(result ?? '');
  const r = result as Record<string, unknown>;
  if (typeof r.error === 'string') return `❌ ${r.error}`;
  if (typeof r.nodeCount === 'number') return `Wiki ${r.nodeCount} 节点`;
  if (typeof r.totalQuestions === 'number') return `${r.totalQuestions} 道题`;
  if (typeof r.studentCount === 'number') return `${r.studentCount} 名学生 / ${r.branchCount} 分支`;
  if (typeof r.slideCount === 'number') return `${r.slideCount} 页课件`;
  if (typeof r.charCount === 'number') return `教案 ${r.charCount} 字`;
  if (typeof r.eventCount === 'number') return `${r.eventCount} 条事件`;
  if (typeof r.alertCount === 'number') return `${r.alertCount} 条预警`;
  try {
    return JSON.stringify(result).slice(0, 200);
  } catch {
    return String(result);
  }
}

/**
 * Agent 事件行渲染组件 —— 从 AgentChatPanel 抽取，供 PortalApp 复用。
 *
 * 统一渲染 Plan/ToolCall/ToolResult/Text/Done/Error 六种事件，
 * 配色与 AgentChatPanel 完全一致，保证跨应用体验统一。
 */
export default function EventRow({ ev }: { ev: AgentEvent }) {
  const step = ev.stepIndex != null ? `#${ev.stepIndex}` : '';
  switch (ev.type) {
    case 'plan':
      return (
        <div className="px-2 py-1 mb-1" style={{ background: '#000080', color: '#fff', fontSize: '11px' }}>
          📋 计划 <span style={{ opacity: 0.7 }}>{step}</span>
          {ev.degraded && <span style={{ opacity: 0.7 }}> · 降级</span>}
          <div>{ev.content}</div>
        </div>
      );
    case 'tool_call':
      return (
        <div className="px-2 py-1 mb-1" style={{ background: '#ffffe0', border: '1px solid #808000', fontSize: '11px' }}>
          🔧 调用 <b>{ev.toolName}</b> <span style={{ opacity: 0.7 }}>{step}</span>
          {ev.toolArgs && Object.keys(ev.toolArgs).length > 0 && (
            <span style={{ opacity: 0.7 }}> · {JSON.stringify(ev.toolArgs)}</span>
          )}
        </div>
      );
    case 'tool_result':
      return (
        <details className="px-2 py-1 mb-1" style={{ background: '#f0fff0', border: '1px solid #90c090', fontSize: '11px' }}>
          <summary>
            ✓ {ev.toolName} 结果 <span style={{ opacity: 0.6 }}>{previewResult(ev.toolResult)}</span>
            {ev.elapsedMs != null && <span style={{ opacity: 0.6 }}> · {ev.elapsedMs}ms</span>}
          </summary>
          <pre className="mt-1" style={{ fontSize: '10px', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
            {(() => {
              try { return JSON.stringify(ev.toolResult, null, 2); } catch { return String(ev.toolResult); }
            })()}
          </pre>
        </details>
      );
    case 'text':
      return (
        <div className="px-2 py-1 mb-1" style={{ background: '#fff', border: '1px solid #c0c0c0', fontSize: '11px' }}>
          {ev.content}
        </div>
      );
    case 'done':
      return (
        <div className="px-2 py-1 mb-1" style={{ background: '#008000', color: '#fff', fontSize: '11px' }}>
          ✅ 完成{ev.content ? `：${ev.content}` : ''}
        </div>
      );
    case 'error':
      return (
        <div className="px-2 py-1 mb-1" style={{ background: '#c00', color: '#fff', fontSize: '11px' }}>
          ❌ {ev.error}
        </div>
      );
    default:
      return null;
  }
}
