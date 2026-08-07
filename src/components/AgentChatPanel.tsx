import { useEffect, useRef, useState } from 'react';
import { getAgentOrchestrator } from '../harness/agent';
import type { AgentEvent } from '../harness/agent';
import type { ScenarioType } from '../harness/types';
import EventRow from './AgentEventRow';

interface Props {
  scenario?: ScenarioType;
}

const SUGGESTIONS = [
  '整理这节课的知识点并出一套复习题',
  '生成一份教案',
  '分析这堂课',
  '出演练剧本',
];

/**
 * Agent 对话面板 — 输入自然语言目标，流式渲染 Plan→Tool→Done 全过程。
 *
 * 消费 getAgentOrchestrator().run() 的 AsyncIterable<AgentEvent>，
 * 与 VLMProvider.analyzeStream 同构（UI for await 消费）。
 * mock/api 模式由 apiConfigStore.agent.active 决定，切换后下次运行生效。
 */
export default function AgentChatPanel({ scenario = 'classroom' }: Props) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const stoppedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [events]);

  const run = async (goal: string) => {
    if (!goal.trim() || running) return;
    setRunning(true);
    stoppedRef.current = false;
    setEvents([]);
    const orchestrator = getAgentOrchestrator();
    try {
      for await (const ev of orchestrator.run({ goal, context: { scenario } })) {
        if (stoppedRef.current) break;
        setEvents((prev) => [...prev, ev]);
        if (ev.type === 'done' || ev.type === 'error') break;
      }
    } catch (e) {
      setEvents((prev) => [
        ...prev,
        { type: 'error', error: e instanceof Error ? e.message : String(e) },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const handleSend = () => {
    const g = input.trim();
    if (!g || running) return;
    setInput('');
    void run(g);
  };

  const handleStop = () => {
    stoppedRef.current = true;
    setRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="win-fieldset h-full flex flex-col">
      <legend>🤖 AI 助理 Agent</legend>
      <div ref={containerRef} className="win-sunken bg-white p-2 flex-1 overflow-auto" style={{ minHeight: '200px' }}>
        {events.length === 0 && !running && (
          <div className="text-gray-500 italic" style={{ fontSize: '11px' }}>
            ▌输入目标，AI Agent 会自主规划并调用工具完成。例如「整理这节课知识点并出题」。
          </div>
        )}
        {events.map((ev, i) => (
          <EventRow key={i} ev={ev} />
        ))}
        {running && <span className="animate-blink" style={{ fontSize: '11px' }}>▌</span>}
      </div>

      {/* 建议目标 */}
      {!running && (
        <div className="mt-1 flex flex-wrap gap-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="win-button"
              style={{ fontSize: '10px', padding: '1px 6px' }}
              onClick={() => void run(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 输入栏 */}
      <div className="mt-1 flex gap-1">
        <input
          className="win-input flex-1"
          type="text"
          placeholder="输入目标，如：把这节课知识点整理成 Wiki..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={running}
        />
        {running ? (
          <button className="win-button" onClick={handleStop} style={{ padding: '2px 10px' }}>
            停止
          </button>
        ) : (
          <button className="win-button" onClick={handleSend} disabled={!input.trim()} style={{ padding: '2px 10px' }}>
            运行
          </button>
        )}
      </div>
    </div>
  );
}
