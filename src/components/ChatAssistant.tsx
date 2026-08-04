import { useEffect, useRef, useState } from 'react';
import type { AssistantScriptItem, WikiNode } from '../harness/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface Props {
  /** 助手脚本问答库 */
  script: AssistantScriptItem[];
  /** 当前选中知识点（作为系统上下文） */
  currentNode: WikiNode | null;
  /** 回放跳转回调 */
  onSeekClassroom?: (t: number) => void;
}

/**
 * AI 助手聊天界面 — 脚本驱动问答
 * - 关键词匹配查找最佳答案
 * - 选中 wiki 节点作为上下文前缀
 * - 打字机输出
 */
export default function ChatAssistant({ script, currentNode, onSeekClassroom }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是基于本课堂内容生成的 AI 学习助手。可以问我本节课涉及的任何知识点，或点击右侧课堂引用跳转回放。',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current != null) clearInterval(typingTimerRef.current);
    };
  }, []);

  // 自动滚动到底
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const findAnswer = (q: string): string => {
    if (script.length === 0) return '当前场景暂未配置问答脚本。';
    const lowerQ = q.toLowerCase();
    // 关键词匹配优先
    let best: AssistantScriptItem | null = null;
    let bestScore = 0;
    for (const item of script) {
      let score = 0;
      if (item.keywords) {
        for (const k of item.keywords) {
          if (lowerQ.includes(k.toLowerCase())) score += 5;
        }
      }
      // q 字段包含匹配
      const qLower = item.q.toLowerCase();
      const overlap = qLower.split(/\s+/).filter((w) => w.length > 1 && lowerQ.includes(w)).length;
      score += overlap * 2;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore > 0) return best.a;
    // 兜底：返回第一条
    return script[0].a;
  };

  const handleSend = () => {
    const q = input.trim();
    if (!q || typing) return;
    const userMsg: ChatMessage = { role: 'user', content: q, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // 模拟思考延迟 + 打字机输出
    const fullAnswer = findAnswer(q);
    const ctxPrefix = currentNode ? `[上下文：${currentNode.title}] ` : '';
    const final = ctxPrefix + fullAnswer;
    let i = 0;
    const partial: ChatMessage = { role: 'assistant', content: '', ts: Date.now() };
    setMessages((prev) => [...prev, partial]);

    typingTimerRef.current = window.setInterval(() => {
      i += 2;
      if (i >= final.length) {
        if (typingTimerRef.current != null) clearInterval(typingTimerRef.current);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...partial, content: final };
          return next;
        });
        setTyping(false);
        return;
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...partial, content: final.slice(0, i) };
        return next;
      });
    }, 30);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 推荐问题（取前 3 条）
  const suggestions = script.slice(0, 3);

  return (
    <div className="win-fieldset h-full flex flex-col">
      <legend>🤖 AI 学习助手</legend>
      <div ref={containerRef} className="win-sunken bg-white p-2 flex-1 overflow-auto" style={{ fontSize: '11px', lineHeight: '1.5', minHeight: '120px' }}>
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="px-2 py-1 max-w-[85%]"
              style={{
                background: m.role === 'user' ? '#000080' : '#ffffe0',
                color: m.role === 'user' ? '#fff' : '#000',
                border: m.role === 'user' ? '1px solid #000080' : '1px solid #808000',
                fontSize: '11px',
              }}
            >
              {m.role === 'assistant' && <div style={{ fontSize: '9px', color: '#808000', marginBottom: '2px' }}>AI 助手</div>}
              {m.content}
              {i === messages.length - 1 && typing && <span className="animate-blink">▌</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 推荐问题 */}
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="win-button"
              style={{ fontSize: '10px', padding: '1px 6px', minWidth: '40px' }}
              onClick={() => setInput(s.q)}
              disabled={typing}
            >
              {s.q.length > 14 ? s.q.slice(0, 14) + '…' : s.q}
            </button>
          ))}
        </div>
      )}

      {/* 输入栏 */}
      <div className="mt-1 flex gap-1">
        <input
          className="win-input flex-1"
          type="text"
          placeholder={currentNode ? `询问关于「${currentNode.title}」...` : '输入问题...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={typing}
        />
        <button className="win-button" onClick={handleSend} disabled={typing || !input.trim()} style={{ padding: '2px 10px' }}>
          发送
        </button>
      </div>
      {currentNode?.classroomRefs && currentNode.classroomRefs.length > 0 && onSeekClassroom && (
        <div className="mt-1 flex flex-wrap gap-1">
          <span style={{ fontSize: '10px', color: '#808080' }}>课堂引用:</span>
          {currentNode.classroomRefs.map((ref, i) => (
            <button
              key={i}
              className="win-button"
              style={{ fontSize: '10px', padding: '1px 4px', minWidth: '30px' }}
              onClick={() => onSeekClassroom(ref.t)}
              title={ref.label}
            >
              ⏱ {Math.floor(ref.t / 60)}:{(ref.t % 60).toString().padStart(2, '0')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
