import { useEffect, useRef, useState } from 'react';
import {
  createBlock,
  htmlToInlineMd,
  parseBlocks,
  renderBlockHtml,
  serializeBlocks,
  type Block,
  type BlockType,
} from '../lib/markdown';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const BLOCK_TYPES: { type: BlockType; label: string; title: string }[] = [
  { type: 'p', label: '¶', title: '段落' },
  { type: 'h1', label: 'H1', title: '一级标题' },
  { type: 'h2', label: 'H2', title: '二级标题' },
  { type: 'h3', label: 'H3', title: '三级标题' },
  { type: 'h4', label: 'H4', title: '四级标题' },
  { type: 'quote', label: '❝', title: '引用' },
  { type: 'ul', label: '▸', title: '无序列表' },
  { type: 'ol', label: '1.', title: '有序列表' },
  { type: 'code', label: '{ }', title: '代码块' },
  { type: 'table', label: '▤', title: '表格' },
  { type: 'hr', label: '—', title: '分割线' },
];

const INLINE_TOOLS: { cmd: string; label: string; title: string; style?: React.CSSProperties }[] = [
  { cmd: 'bold', label: 'B', title: '加粗', style: { fontWeight: 'bold' } },
  { cmd: 'italic', label: 'I', title: '斜体', style: { fontStyle: 'italic' } },
  { cmd: 'code', label: '</>', title: '行内代码' },
  { cmd: 'link', label: '🔗', title: '链接' },
];

/**
 * WYSIWYG 块级编辑器 — 预览即编辑
 * - 内容按 markdown 解析成块，每块 contenteditable，所见即所得
 * - 工具栏：块类型切换 + 行内格式（execCommand）+ 块级操作（上移/下移/删除/插入）
 * - 失焦时读取 innerHTML 反序列化为 markdown 行内标记
 * - 外部 value 变化（Agent 插入草稿）时重建块
 */
export default function WysiwygEditor({ value, onChange, placeholder }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(value));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);

  // 外部 value 变化时重建块（编辑时跳过避免循环）
  useEffect(() => {
    if (editingRef.current) return;
    const current = serializeBlocks(blocks);
    if (current !== value) {
      setBlocks(parseBlocks(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: Block[]) => {
    editingRef.current = true;
    setBlocks(next);
    onChange(serializeBlocks(next));
    Promise.resolve().then(() => {
      editingRef.current = false;
    });
  };

  // 块失焦时读取 DOM 反序列化
  const syncBlock = (id: string) => {
    const el = containerRef.current?.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    setBlocks((prev) => {
      const block = prev.find((b) => b.id === id);
      if (!block) return prev;
      let patch: Partial<Block> = {};
      if (block.type === 'ul' || block.type === 'ol') {
        const list = el.querySelector('ul,ol');
        const lis = list ? list.querySelectorAll(':scope > li') : [];
        patch = { items: Array.from(lis).map((li) => htmlToInlineMd((li as HTMLElement).innerHTML)) };
      } else if (block.type === 'table') {
        const table = el.querySelector('table');
        const trs = table ? table.querySelectorAll('tr') : [];
        const rows = Array.from(trs).map((tr) =>
          Array.from(tr.querySelectorAll('th,td')).map((c) => htmlToInlineMd((c as HTMLElement).innerHTML)),
        );
        patch = { rows };
      } else if (block.type === 'code') {
        const pre = el.querySelector('pre');
        patch = { code: pre?.textContent || '' };
      } else if (block.type !== 'hr') {
        const ed = el.querySelector('h1,h2,h3,h4,p,blockquote') as HTMLElement | null;
        patch = { text: htmlToInlineMd(ed?.innerHTML || '') };
      }
      if (Object.keys(patch).length === 0) return prev;
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      editingRef.current = true;
      onChange(serializeBlocks(next));
      Promise.resolve().then(() => {
        editingRef.current = false;
      });
      return next;
    });
  };

  // 行内格式：execCommand 作用于当前选中文本
  const applyInline = (cmd: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (cmd === 'link') {
      const url = window.prompt('输入链接 URL：', 'https://');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (cmd === 'code') {
      const range = sel.getRangeAt(0);
      if (range.collapsed) return;
      const text = range.toString();
      const codeEl = document.createElement('code');
      codeEl.textContent = text;
      range.deleteContents();
      range.insertNode(codeEl);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartAfter(codeEl);
      sel.addRange(newRange);
    } else {
      document.execCommand(cmd, false);
    }
  };

  // 块类型切换：改当前焦点块类型，或末尾插入新块
  const changeBlockType = (type: BlockType) => {
    if (!focusedId) {
      const nb = createBlock(type);
      commit([...blocks, nb]);
      setFocusedId(nb.id);
      return;
    }
    const idx = blocks.findIndex((b) => b.id === focusedId);
    if (idx === -1) return;
    const cur = blocks[idx];
    // 转换内容到新类型
    let nb: Block;
    if (type === 'hr') {
      nb = createBlock('hr');
    } else if (type === 'table') {
      nb = createBlock('table');
    } else if (type === 'code') {
      nb = createBlock('code', { code: cur.text || cur.code || (cur.items || []).join('\n') });
    } else if (type === 'ul' || type === 'ol') {
      const items = cur.items || (cur.text ? cur.text.split('\n') : ['']);
      nb = { ...createBlock(type, { items }), id: cur.id };
    } else {
      const text = cur.text || cur.code || (cur.items || []).join('\n');
      nb = { ...createBlock(type, { text }), id: cur.id };
    }
    const next = [...blocks];
    next[idx] = nb;
    if (type === 'hr') {
      // 分割线后插入空段落供继续编辑
      const np = createBlock('p');
      next.splice(idx + 1, 0, np);
      setFocusedId(np.id);
    }
    commit(next);
  };

  // 块级操作
  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const j = idx + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  };
  const deleteBlock = (id: string) => {
    commit(blocks.filter((b) => b.id !== id));
    setFocusedId(null);
  };
  const insertAfter = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const nb = createBlock('p');
    const next = [...blocks];
    next.splice(idx + 1, 0, nb);
    commit(next);
    setFocusedId(nb.id);
    // 聚焦新块
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-block-id="${nb.id}"] [contenteditable]`) as HTMLElement | null;
      el?.focus();
    });
  };

  // 列表项 / 表格行列操作
  const addListItem = (id: string) => {
    const next = blocks.map((b) => (b.id === id ? { ...b, items: [...(b.items || []), ''] } : b));
    commit(next);
  };
  const addTableRow = (id: string) => {
    const next = blocks.map((b) => {
      if (b.id !== id || !b.rows) return b;
      const cols = b.rows[0]?.length || 1;
      return { ...b, rows: [...b.rows, Array(cols).fill('')] };
    });
    commit(next);
  };
  const addTableCol = (id: string) => {
    const next = blocks.map((b) => {
      if (b.id !== id || !b.rows) return b;
      return { ...b, rows: b.rows.map((r) => [...r, '']), aligns: [...(b.aligns || []), 'left' as const] };
    });
    commit(next);
  };

  const focused = blocks.find((b) => b.id === focusedId) || null;

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 工具栏 */}
      <div className="win-raised-thin flex items-center gap-px flex-wrap" style={{ padding: '2px 3px' }}>
        {BLOCK_TYPES.map((t) => (
          <button
            key={t.type}
            className="win-button"
            title={t.title}
            onClick={() => changeBlockType(t.type)}
            style={{
              minWidth: '26px',
              minHeight: '20px',
              padding: '1px 5px',
              fontSize: '11px',
              fontWeight: 'bold',
              background: focused?.type === t.type ? '#000080' : undefined,
              color: focused?.type === t.type ? '#fff' : undefined,
            }}
          >
            {t.label}
          </button>
        ))}
        <div className="win-separator-v" style={{ height: '16px', margin: '0 3px' }} />
        {INLINE_TOOLS.map((t) => (
          <button
            key={t.cmd}
            className="win-button"
            title={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyInline(t.cmd)}
            style={{ minWidth: '26px', minHeight: '20px', padding: '1px 5px', fontSize: '11px', ...(t.style || {}) }}
          >
            {t.label}
          </button>
        ))}
        <div className="win-separator-v" style={{ height: '16px', margin: '0 3px' }} />
        <button className="win-button" title="上移当前块" onClick={() => focusedId && moveBlock(focusedId, -1)} disabled={!focusedId} style={{ minWidth: '22px', minHeight: '20px', padding: '1px 4px', fontSize: '11px' }}>▲</button>
        <button className="win-button" title="下移当前块" onClick={() => focusedId && moveBlock(focusedId, 1)} disabled={!focusedId} style={{ minWidth: '22px', minHeight: '20px', padding: '1px 4px', fontSize: '11px' }}>▼</button>
        <button className="win-button" title="在下方插入段落" onClick={() => focusedId && insertAfter(focusedId)} disabled={!focusedId} style={{ minWidth: '22px', minHeight: '20px', padding: '1px 4px', fontSize: '11px' }}>＋</button>
        <button className="win-button" title="删除当前块" onClick={() => focusedId && deleteBlock(focusedId)} disabled={!focusedId} style={{ minWidth: '22px', minHeight: '20px', padding: '1px 4px', fontSize: '11px' }}>×</button>
      </div>

      {/* WYSIWYG 画布 */}
      <div
        ref={containerRef}
        className="wysiwyg-canvas win-sunken"
        style={{ flex: 1, overflow: 'auto', padding: '16px 20px', fontSize: '13px', lineHeight: '1.7', background: '#fff' }}
      >
        {blocks.length === 0 && (
          <div
            style={{ color: '#808080', fontStyle: 'italic', cursor: 'text', padding: '8px' }}
            onClick={() => {
              const nb = createBlock('p');
              commit([nb]);
              setFocusedId(nb.id);
              requestAnimationFrame(() => {
                const el = containerRef.current?.querySelector(`[data-block-id="${nb.id}"] [contenteditable]`) as HTMLElement | null;
                el?.focus();
              });
            }}
          >
            {placeholder || '点击开始输入...'}
          </div>
        )}
        {blocks.map((b) => (
          <BlockView
            key={b.id}
            block={b}
            focused={b.id === focusedId}
            onFocus={() => setFocusedId(b.id)}
            onBlur={() => syncBlock(b.id)}
            onAddListItem={() => addListItem(b.id)}
            onAddTableRow={() => addTableRow(b.id)}
            onAddTableCol={() => addTableCol(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

const FOCUS_OUTLINE = '1px dotted #000080';

function BlockView({
  block,
  focused,
  onFocus,
  onBlur,
  onAddListItem,
  onAddTableRow,
  onAddTableCol,
}: {
  block: Block;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onAddListItem: () => void;
  onAddTableRow: () => void;
  onAddTableCol: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  // 初始 innerHTML（仅 id/type 变化时设置，避免编辑时光标重置）
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const expected = renderBlockHtml(block);
    if (el.innerHTML !== expected) {
      el.innerHTML = expected;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, block.type]);

  const ed = {
    contentEditable: true,
    suppressContentEditableWarning: true,
    onFocus,
    onBlur,
  } as const;
  const outline = focused ? FOCUS_OUTLINE : 'none';

  switch (block.type) {
    case 'h1':
      return (
        <div data-block-id={block.id}>
          <h1 ref={ref as React.RefObject<HTMLHeadingElement>} {...ed} style={{ fontSize: '24px', fontWeight: 'bold', margin: '14px 0 6px', outline }} />
        </div>
      );
    case 'h2':
      return (
        <div data-block-id={block.id}>
          <h2 ref={ref as React.RefObject<HTMLHeadingElement>} {...ed} style={{ fontSize: '20px', fontWeight: 'bold', margin: '12px 0 6px', borderBottom: '1px solid #c0c0c0', paddingBottom: '2px', outline }} />
        </div>
      );
    case 'h3':
      return (
        <div data-block-id={block.id}>
          <h3 ref={ref as React.RefObject<HTMLHeadingElement>} {...ed} style={{ fontSize: '17px', fontWeight: 'bold', margin: '10px 0 4px', outline }} />
        </div>
      );
    case 'h4':
      return (
        <div data-block-id={block.id}>
          <h4 ref={ref as React.RefObject<HTMLHeadingElement>} {...ed} style={{ fontSize: '15px', fontWeight: 'bold', margin: '8px 0 4px', outline }} />
        </div>
      );
    case 'p':
      return (
        <div data-block-id={block.id}>
          <p ref={ref as React.RefObject<HTMLParagraphElement>} {...ed} style={{ margin: '6px 0', outline }} />
        </div>
      );
    case 'quote':
      return (
        <div data-block-id={block.id}>
          <blockquote ref={ref as React.RefObject<HTMLQuoteElement>} {...ed} style={{ borderLeft: '4px solid #000080', background: '#ffffe0', padding: '6px 12px', margin: '8px 0', fontStyle: 'italic', outline }} />
        </div>
      );
    case 'ul':
      return (
        <div data-block-id={block.id}>
          <ul ref={ref as React.RefObject<HTMLUListElement>} {...ed} style={{ margin: '6px 0', paddingLeft: '24px', listStyle: 'disc', outline }} />
          <button className="win-button" onClick={onAddListItem} style={{ fontSize: '10px', padding: '1px 6px', marginTop: '2px' }}>＋ 列表项</button>
        </div>
      );
    case 'ol':
      return (
        <div data-block-id={block.id}>
          <ol ref={ref as React.RefObject<HTMLOListElement>} {...ed} style={{ margin: '6px 0', paddingLeft: '24px', listStyle: 'decimal', outline }} />
          <button className="win-button" onClick={onAddListItem} style={{ fontSize: '10px', padding: '1px 6px', marginTop: '2px' }}>＋ 列表项</button>
        </div>
      );
    case 'code':
      return (
        <div data-block-id={block.id}>
          <pre ref={ref as React.RefObject<HTMLPreElement>} {...ed} style={{ background: '#1a1a2e', color: '#4ade80', padding: '8px 12px', borderRadius: '3px', overflow: 'auto', fontFamily: '"Lucida Console", "Courier New", monospace', fontSize: '12px', margin: '8px 0', outline: focused ? '1px dotted #fff' : 'none', whiteSpace: 'pre-wrap' }} />
        </div>
      );
    case 'table':
      return (
        <div data-block-id={block.id}>
          <table ref={ref as React.RefObject<HTMLTableElement>} {...ed} style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0', outline }} />
          <div style={{ marginTop: '2px', display: 'flex', gap: '4px' }}>
            <button className="win-button" onClick={onAddTableRow} style={{ fontSize: '10px', padding: '1px 6px' }}>＋ 行</button>
            <button className="win-button" onClick={onAddTableCol} style={{ fontSize: '10px', padding: '1px 6px' }}>＋ 列</button>
          </div>
          <style>{`[data-block-id="${block.id}"] table th, [data-block-id="${block.id}"] table td { border: 1px solid #808080; padding: 4px 8px; font-size: 12px; } [data-block-id="${block.id}"] table th { background: #c0c0c0; font-weight: bold; }`}</style>
        </div>
      );
    case 'hr':
      return (
        <div data-block-id={block.id}>
          <hr style={{ border: 'none', borderTop: '2px solid #808080', margin: '12px 0' }} />
        </div>
      );
    default:
      return null;
  }
}
