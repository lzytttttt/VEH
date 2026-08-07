import { useEffect, useRef, useState } from 'react';
import type { AssistantScriptItem, WikiNode } from '../harness/types';
import { streamChatCompletion } from '../harness/adapters/sseUtils';
import { getProviderConfig } from '../stores/apiConfigStore';
import { retrieveContext } from '../harness/rag';

interface UIMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface Props {
  /** 助手脚本问答库（关键词降级用） */
  script: AssistantScriptItem[];
  /** 当前选中知识点（作为系统上下文） */
  currentNode: WikiNode | null;
  /** 全部节点（用于解析 currentNode.related 取关联节点摘要） */
  allNodes?: WikiNode[];
  /** 回放跳转回调 */
  onSeekClassroom?: (t: number) => void;
  /** 是否走真 LLM（capability active='api' 时为 true） */
  useLLM?: boolean;
}

const HISTORY_WINDOW = 10;

/**
 * AI 助手聊天界面
 *
 * 双模式：
 * - useLLM=true：走 streamChatCompletion，上下文 = 当前节点 details + 关联节点摘要 +
 *   最近 HISTORY_WINDOW 轮历史。流式 token 直接作为打字机输出。失败自动降级关键词。
 * - useLLM=false（默认）：现有关键词匹配 + 打字机输出（零回归）。
 */
export default function ChatAssistant({
  script,
  currentNode,
  allNodes,
  onSeekClassroom,
  useLLM = false,
}: Props) {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      role: 'assistant',
      content: '你好！我是基于本课堂内容生成的 AI 学习助手。可以问我本节课涉及的任何知识点，或点击右侧课堂引用跳转回放。',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current != null) clearInterval(typingTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  /** 关键词匹配查找最佳答案（降级路径） */
  const findAnswer = (q: string): string => {
    if (script.length === 0) return '当前场景暂未配置问答脚本。';
    const lowerQ = q.toLowerCase();
    let best: AssistantScriptItem | null = null;
    let bestScore = 0;
    for (const item of script) {
      let score = 0;
      if (item.keywords) {
        for (const k of item.keywords) {
          if (lowerQ.includes(k.toLowerCase())) score += 5;
        }
      }
      const qLower = item.q.toLowerCase();
      const overlap = qLower.split(/\s+/).filter((w) => w.length > 1 && lowerQ.includes(w)).length;
      score += overlap * 2;
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
    if (best && bestScore > 0) return best.a;
    return script[0].a;
  };

  /** 把最后一条消息内容更新为 text */
  const setLastContent = (text: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: text };
      return next;
    });
  };

  /** 关键词打字机输出 */
  const typeKeyword = (text: string) => {
    let i = 0;
    typingTimerRef.current = window.setInterval(() => {
      i += 2;
      if (i >= text.length) {
        if (typingTimerRef.current != null) clearInterval(typingTimerRef.current);
        setLastContent(text);
        setTyping(false);
        return;
      }
      setLastContent(text.slice(0, i));
    }, 30);
  };

  /** 构建 LLM 系统提示（当前节点 + 关联节点 + 课堂引用） */
  const buildSystemPrompt = (): string => {
    const node = currentNode;
    const relatedText = (() => {
      if (!node || !allNodes) return '';
      const rel = node.related
        .map((id) => allNodes.find((n) => n.id === id))
        .filter((n): n is WikiNode => Boolean(n))
        .map((n) => `- ${n.title}：${n.summary}`);
      return rel.length ? rel.join('\n') : '';
    })();
    const refsText = node?.classroomRefs.length
      ? node.classroomRefs.map((r) => `[${Math.floor(r.t / 60)}:${(r.t % 60).toString().padStart(2, '0')}] ${r.type}：${r.label}`).join('\n')
      : '';
    return `你是一位教学 AI 助手，基于以下课堂知识回答学生问题。
${node ? `当前知识点：${node.title}\n详细内容：${node.details}` : '（未选中具体知识点，请基于通用知识回答）'}
${relatedText ? `\n关联知识点：\n${relatedText}` : ''}
${refsText ? `\n课堂引用片段：\n${refsText}` : ''}

要求：用初中生能听懂的语言，分点回答，可引用课堂片段。直接输出回答，不要前缀。`;
  };

  /** LLM 流式回答（失败抛错由调用方降级） */
  const streamLLMAnswer = async (question: string, history: UIMessage[]) => {
    const cfg = getProviderConfig('capability');
    const historyMsgs = history.slice(-HISTORY_WINDOW).map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const controller = new AbortController();
    abortRef.current = controller;

    // RAG 检索注入（失败返回空串，不阻断主流程）
    const ragCtx = await retrieveContext(question, 3);
    const systemContent = buildSystemPrompt() + (ragCtx ? `\n\n相关知识检索：\n${ragCtx}` : '');

    let acc = '';
    for await (const token of streamChatCompletion({
      baseURL: cfg.baseURL || '/api/llm',
      apiKey: cfg.apiKey,
      model: cfg.model || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemContent },
        ...historyMsgs,
        { role: 'user', content: question },
      ],
      bodyOverrides: { temperature: 0.5 },
      signal: controller.signal,
    })) {
      acc += token;
      setLastContent(acc);
    }
    if (!acc.trim()) {
      throw new Error('LLM 返回空内容');
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || typing) return;

    // 记录历史（在追加新消息前快照）
    const history = messages;
    const userMsg: UIMessage = { role: 'user', content: q, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    // 占位 assistant 消息
    setMessages((prev) => [...prev, { role: 'assistant', content: '', ts: Date.now() }]);

    if (useLLM) {
      try {
        await streamLLMAnswer(q, history);
        setTyping(false);
        return;
      } catch (e) {
        // LLM 失败 → 降级关键词
        if (typingTimerRef.current != null) clearInterval(typingTimerRef.current);
        const fallback = findAnswer(q);
        const note = '（LLM 不可用，已降级关键词匹配）\n';
        typeKeyword(note + fallback);
        return;
      }
    }

    // 关键词模式（现有逻辑）
    const fullAnswer = findAnswer(q);
    const ctxPrefix = currentNode ? `[上下文：${currentNode.title}] ` : '';
    typeKeyword(ctxPrefix + fullAnswer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // 推荐问题（取前 3 条）
  const suggestions = script.slice(0, 3);

  return (
    <div className="win-fieldset h-full flex flex-col">
      <legend>
        🤖 AI 学习助手
        {useLLM && <span style={{ fontSize: '9px', color: '#008000', marginLeft: '4px' }}>· LLM</span>}
      </legend>
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
              <div className="whitespace-pre-wrap">{m.content}</div>
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
        <button className="win-button" onClick={() => void handleSend()} disabled={typing || !input.trim()} style={{ padding: '2px 10px' }}>
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
