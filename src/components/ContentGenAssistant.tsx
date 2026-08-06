import { useEffect, useRef, useState } from 'react';

/** 通用 chunk 形状（两个独立 harness 的 chunk 均满足） */
interface ChunkLike {
  content: string;
  done?: boolean;
}

/** 通用 provider 形状（接受任意 draftInput/chatInput） */
interface ProviderLike {
  streamDraft(input: unknown): AsyncIterable<ChunkLike>;
  streamChat(input: unknown): AsyncIterable<ChunkLike>;
}

interface Props {
  /** 独立 harness 的 provider 实例（lessonPlan / slides 各自注入） */
  provider: ProviderLike;
  /** 构造 draft 输入（由父组件按 harness 类型组装） */
  buildDraftInput: (topic: string, subject: string) => unknown;
  /** 构造 chat 输入（由父组件按 harness 类型组装） */
  buildChatInput: (query: string, currentContent: string) => unknown;
  /** 标识：lesson_plan | slides，用于文案 */
  kind: 'lesson_plan' | 'slides';
  /** 当前编辑器内容（作为对话上下文） */
  currentContent: string;
  /** 插入到编辑器回调 */
  onInsert: (text: string, mode: 'append' | 'replace') => void;
  defaultTopic?: string;
  defaultSubject?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  insertable?: boolean;
  ts: number;
}

const INTRO: Record<Props['kind'], string> = {
  lesson_plan:
    '你好！我是教案生成助手。在上方填写课题后点击「一键生成草稿」，我将流式产出完整教案（所见即所得，可直接在编辑器修改）；下方可继续追问微调（如"导入环节怎么设计"）。',
  slides:
    '你好！我是课件生成助手。在上方填写课题后点击「一键生成草稿」，我将按 `---` 分页流式产出幻灯片；下方可继续追问微调（如"增加几张幻灯片""3 套 design 怎么选"）。',
};

/**
 * 生成助手 Agent — 显眼位置的对话面板（通用，接受任意独立 harness provider）
 * - 顶部「一键生成草稿」按钮：流式产出草稿
 * - 中部对话面板：流式追问微调
 * - 每条 assistant 消息末尾提供「追加到编辑器」「替换编辑器」按钮
 */
export default function ContentGenAssistant({
  provider,
  buildDraftInput,
  buildChatInput,
  kind,
  currentContent,
  onInsert,
  defaultTopic,
  defaultSubject,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: INTRO[kind], insertable: false, ts: Date.now() },
  ]);
  const [topic, setTopic] = useState(defaultTopic ?? '');
  const [subject, setSubject] = useState(defaultSubject ?? '数学');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultTopic !== undefined) setTopic(defaultTopic);
  }, [defaultTopic]);
  useEffect(() => {
    if (defaultSubject !== undefined) setSubject(defaultSubject);
  }, [defaultSubject]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      abortedRef.current = true;
    };
  }, []);

  const appendChunk = (chunk: ChunkLike) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, content: last.content + chunk.content };
      return next;
    });
  };

  const handleGenerate = async () => {
    if (busy) return;
    const t = topic.trim() || '函数单调性判定';
    abortedRef.current = false;
    setBusy(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', insertable: false, ts: Date.now() }]);
    try {
      for await (const chunk of provider.streamDraft(buildDraftInput(t, subject))) {
        if (abortedRef.current) break;
        appendChunk(chunk);
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], insertable: true };
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: `⚠ 生成失败：${msg}` };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || busy) return;
    abortedRef.current = false;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: q, ts: Date.now() },
      { role: 'assistant', content: '', insertable: false, ts: Date.now() },
    ]);
    setInput('');
    setBusy(true);
    try {
      for await (const chunk of provider.streamChat(buildChatInput(q, currentContent))) {
        if (abortedRef.current) break;
        appendChunk(chunk);
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], insertable: true };
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: `⚠ 回答失败：${msg}` };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="win-fieldset h-full flex flex-col" style={{ padding: '8px 6px 6px' }}>
      <legend>🤖 生成助手 Agent</legend>

      {/* 一键生成草稿区 */}
      <div className="flex flex-col gap-1" style={{ marginBottom: '4px' }}>
        <div className="flex gap-1">
          <input
            className="win-input flex-1"
            placeholder="课题（如：函数单调性判定）"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={busy}
            style={{ fontSize: '11px' }}
          />
          <select
            className="win-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={busy}
            style={{ fontSize: '11px', width: '70px' }}
          >
            <option value="数学">数学</option>
            <option value="物理">物理</option>
            <option value="化学">化学</option>
            <option value="语文">语文</option>
            <option value="英语">英语</option>
            <option value="体育">体育</option>
            <option value="实训">实训</option>
          </select>
        </div>
        <button
          className="win-button is-default"
          onClick={handleGenerate}
          disabled={busy}
          title="流式生成完整草稿，生成后可一键插入编辑器"
          style={{ fontSize: '11px', padding: '3px 10px', fontWeight: 'bold' }}
        >
          {busy ? '▌ 生成中...' : '⚡ 一键生成草稿'}
        </button>
      </div>

      {/* 消息流 */}
      <div
        ref={scrollRef}
        className="win-sunken flex-1"
        style={{ padding: '6px', overflow: 'auto', fontSize: '11px', lineHeight: '1.55', minHeight: '120px' }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="px-2 py-1"
              style={{
                maxWidth: '92%',
                background: m.role === 'user' ? '#000080' : '#ffffe0',
                color: m.role === 'user' ? '#fff' : '#000',
                border: m.role === 'user' ? '1px solid #000080' : '1px solid #808000',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {m.role === 'assistant' && (
                <div style={{ fontSize: '9px', color: '#808000', marginBottom: '2px' }}>AI 助手</div>
              )}
              {m.content || (busy && i === messages.length - 1 ? '' : '（空）')}
              {busy && i === messages.length - 1 && m.role === 'assistant' && (
                <span className="animate-blink">▌</span>
              )}
              {m.insertable && !busy && m.role === 'assistant' && m.content && (
                <div className="flex gap-1" style={{ marginTop: '6px', borderTop: '1px dotted #808000', paddingTop: '4px' }}>
                  <button
                    className="win-button"
                    onClick={() => onInsert(m.content, 'append')}
                    style={{ fontSize: '10px', padding: '1px 6px', minWidth: '40px' }}
                    title="将此草稿追加到编辑器末尾"
                  >
                    ↓ 追加到编辑器
                  </button>
                  <button
                    className="win-button"
                    onClick={() => onInsert(m.content, 'replace')}
                    style={{ fontSize: '10px', padding: '1px 6px', minWidth: '40px' }}
                    title="用此草稿替换编辑器全部内容"
                  >
                    ⇄ 替换编辑器
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 输入栏 */}
      <div className="flex gap-1" style={{ marginTop: '4px' }}>
        <input
          className="win-input flex-1"
          type="text"
          placeholder={busy ? '生成中，请稍候...' : '追问微调（如：导入环节怎么设计）'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          style={{ fontSize: '11px' }}
        />
        <button
          className="win-button"
          onClick={handleSend}
          disabled={busy || !input.trim()}
          style={{ padding: '2px 10px', fontSize: '11px' }}
        >
          发送
        </button>
      </div>
    </div>
  );
}
