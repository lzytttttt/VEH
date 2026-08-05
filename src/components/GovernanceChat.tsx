import { useEffect, useRef, useState } from 'react';
import { getGovernanceProvider } from '../harness/providerRegistry';
import type { GovernanceChunk, GovernanceContext } from '../harness/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface Props {
  ctx: GovernanceContext;
}

const SUGGESTIONS = ['全校教学质量趋势', '班级排名对比', '哪个教师需要教研', '学科分析', '异常预警', '教研建议'];

/**
 * Agent 对话面板 — 调用 GovernanceProvider.streamInsight 流式回答
 * 适配 ChatAssistant 对话 UI 风格，但用真实 Provider 流式替代关键词匹配
 */
export default function GovernanceChat({ ctx }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '您好！我是学校治理 AI Agent。可以追问"班级排名""教师对比""学科分析""异常预警""教研建议"等，我将基于全校数据为您分析。',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => () => { abortRef.current = true; }, []);

  const handleSend = async (q?: string) => {
    const question = (q ?? input).trim();
    if (!question || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: question, ts: Date.now() };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', ts: Date.now() };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    abortRef.current = false;

    const provider = getGovernanceProvider();
    const collected: GovernanceChunk[] = [];
    try {
      for await (const chunk of provider.streamInsight(question, ctx)) {
        if (abortRef.current) break;
        collected.push(chunk);
        const text = collected.map((c) => c.content).join('\n');
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...assistantMsg, content: text };
          return next;
        });
      }
    } catch (e) {
      console.error('streamInsight failed', e);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...assistantMsg, content: '⚠️ Agent 分析失败，请稍后重试。' };
        return next;
      });
    }
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="win-fieldset h-full flex flex-col">
      <legend>🤖 治理 Agent 对话</legend>
      <div
        ref={containerRef}
        className="win-sunken bg-white p-2 flex-1 overflow-auto"
        style={{ fontSize: '11px', lineHeight: '1.5', minHeight: '100px' }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="px-2 py-1 max-w-[88%]"
              style={{
                background: m.role === 'user' ? '#000080' : '#ffffe0',
                color: m.role === 'user' ? '#fff' : '#000',
                border: m.role === 'user' ? '1px solid #000080' : '1px solid #808000',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.role === 'assistant' && <div style={{ fontSize: '9px', color: '#808000', marginBottom: '2px' }}>AI Agent</div>}
              {m.content}
              {i === messages.length - 1 && streaming && <span className="animate-blink">▌</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="win-button"
            style={{ fontSize: '10px', padding: '1px 6px', minWidth: '40px' }}
            onClick={() => handleSend(s)}
            disabled={streaming}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-1 flex gap-1">
        <input
          className="win-input flex-1"
          type="text"
          placeholder="向 Agent 提问..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming}
        />
        <button className="win-button" onClick={() => handleSend()} disabled={streaming || !input.trim()} style={{ padding: '2px 10px' }}>
          发送
        </button>
      </div>
    </div>
  );
}
