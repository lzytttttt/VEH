/**
 * 轻量 Markdown → HTML 渲染器（自研，零外部依赖）
 *
 * 覆盖 Word/PPT 基础排版需求：
 *   标题 H1-H4、加粗、斜体、行内代码、代码块、引用、有序/无序列表、
 *   链接、表格、分割线、段落
 *
 * 设计：行级块解析 + 行内 span 解析，HTML 转义防 XSS。
 * 不追求 CommonMark 100% 合规，优先服务教案/课件教学场景。
 */

/** HTML 转义 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 行内规则：code > bold > italic > link（顺序敏感，避免互相破坏） */
function renderInline(s: string): string {
  let out = escapeHtml(s);
  // 行内代码 `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 加粗 **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 斜体 *italic*（避开已被加粗消费的 **）
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  // 链接 [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return out;
}

/** 表格解析：首行表头 + 第二行分隔（|---|）+ 数据行 */
function renderTable(lines: string[]): { html: string; consumed: number } {
  if (lines.length < 2) return { html: '', consumed: 0 };
  const splitRow = (l: string) =>
    l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const header = splitRow(lines[0]);
  const sep = splitRow(lines[1]);
  // 校验分隔行：每列应为 --- 或 :---: 等
  if (!sep.every((c) => /^:?-{3,}:?$/.test(c))) {
    return { html: '', consumed: 0 };
  }
  const aligns = sep.map((c) => {
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });
  const rows: string[][] = [];
  let i = 2;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    rows.push(splitRow(lines[i]));
    i++;
  }
  const ths = header
    .map((c, j) => `<th style="text-align:${aligns[j] || 'left'}">${renderInline(c)}</th>`)
    .join('');
  const trs = rows
    .map(
      (r) =>
        '<tr>' +
        r
          .map((c, j) => `<td style="text-align:${aligns[j] || 'left'}">${renderInline(c)}</td>`)
          .join('') +
        '</tr>',
    )
    .join('');
  return {
    html: `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`,
    consumed: i,
  };
}

/** 主渲染入口 */
export function renderMarkdown(md: string): string {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  let listType: 'ul' | 'ol' | null = null;
  let quoteBuf: string[] = [];

  const flushList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const flushQuote = () => {
    if (quoteBuf.length > 0) {
      out.push(`<blockquote>${quoteBuf.map(renderInline).join('<br/>')}</blockquote>`);
      quoteBuf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 代码块 ```
    if (trimmed.startsWith('```')) {
      flushList();
      flushQuote();
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      out.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`,
      );
      continue;
    }

    // 表格（| 开头）
    if (trimmed.startsWith('|')) {
      flushList();
      flushQuote();
      const rest = lines.slice(i);
      const { html, consumed } = renderTable(rest);
      if (consumed > 0) {
        out.push(html);
        i += consumed;
        continue;
      }
    }

    // 分割线
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed) || /^___+$/.test(trimmed)) {
      flushList();
      flushQuote();
      out.push('<hr/>');
      i++;
      continue;
    }

    // 标题 H1-H4
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushList();
      flushQuote();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(trimmed)) {
      flushList();
      quoteBuf.push(trimmed.replace(/^>\s?/, ''));
      i++;
      continue;
    }
    flushQuote();

    // 无序列表
    if (/^[-*+]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        flushList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${renderInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // 有序列表
    const ol = /^\d+\.\s+/.exec(trimmed);
    if (ol) {
      if (listType !== 'ol') {
        flushList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${renderInline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }
    flushList();

    // 空行
    if (trimmed === '') {
      out.push('');
      i++;
      continue;
    }

    // 段落（单行）
    out.push(`<p>${renderInline(trimmed)}</p>`);
    i++;
  }
  flushList();
  flushQuote();
  return out.join('\n');
}

/** 把 slides markdown 按 `---` 分页，返回每页 markdown 数组 */
export function splitSlides(md: string): string[] {
  if (!md) return [''];
  const normalized = md.replace(/\r\n/g, '\n');
  // 仅识别独占一行的 --- 为分页符
  const parts = normalized.split(/\n\s*---\s*\n/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** 合并 slides 数组为带 `---` 分页的 markdown */
export function joinSlides(slides: string[]): string {
  return slides.join('\n\n---\n\n');
}

// ============ 块级解析与序列化（支持 WYSIWYG 块级编辑） ============

export type BlockType = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'quote' | 'ul' | 'ol' | 'code' | 'hr' | 'table';

export interface Block {
  id: string;
  type: BlockType;
  /** 文本类块（hN/p/quote）的单文本字段（含行内 md 标记 **bold** 等） */
  text?: string;
  /** 列表块（ul/ol）的项数组（每项含行内 md 标记） */
  items?: string[];
  /** 代码块的源码 */
  code?: string;
  /** 代码块语言 */
  lang?: string;
  /** 表格行（首行为表头） */
  rows?: string[][];
  /** 表格列对齐 */
  aligns?: ('left' | 'center' | 'right')[];
}

let blockIdSeq = 0;
function newBlockId(): string {
  return `blk-${blockIdSeq++}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 把 markdown 解析成 Block 数组（块级结构，供 WYSIWYG 编辑） */
export function parseBlocks(md: string): Block[] {
  if (!md) return [];
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 代码块
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      blocks.push({ id: newBlockId(), type: 'code', code: code.join('\n'), lang });
      continue;
    }

    // 表格
    if (trimmed.startsWith('|')) {
      const parsed = parseTableLines(lines.slice(i));
      if (parsed.consumed > 0) {
        blocks.push({ id: newBlockId(), type: 'table', rows: parsed.rows, aligns: parsed.aligns });
        i += parsed.consumed;
        continue;
      }
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ id: newBlockId(), type: 'hr' });
      i++;
      continue;
    }

    // 标题
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length as 1 | 2 | 3 | 4;
      blocks.push({ id: newBlockId(), type: (`h${level}` as BlockType), text: h[2] });
      i++;
      continue;
    }

    // 引用（合并连续 > 行）
    if (/^>\s?/.test(trimmed)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ id: newBlockId(), type: 'quote', text: buf.join('\n') });
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ id: newBlockId(), type: 'ul', items });
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ id: newBlockId(), type: 'ol', items });
      continue;
    }

    // 空行跳过
    if (trimmed === '') {
      i++;
      continue;
    }

    // 段落（合并连续非特殊行）
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4}\s|>|[-*+]\s|\d+\.\s|```|(-{3,}|\*{3,}|_{3,})$|\|)/.test(lines[i].trim())
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ id: newBlockId(), type: 'p', text: buf.join('\n') });
  }
  return blocks;
}

function parseTableLines(lines: string[]): { rows: string[][]; aligns: ('left' | 'center' | 'right')[]; consumed: number } {
  if (lines.length < 2) return { rows: [], aligns: [], consumed: 0 };
  const splitRow = (l: string) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const header = splitRow(lines[0]);
  const sep = splitRow(lines[1]);
  if (!sep.every((c) => /^:?-{3,}:?$/.test(c))) {
    return { rows: [], aligns: [], consumed: 0 };
  }
  const aligns = sep.map((c) => {
    if (c.startsWith(':') && c.endsWith(':')) return 'center' as const;
    if (c.endsWith(':')) return 'right' as const;
    return 'left' as const;
  });
  const rows: string[][] = [header];
  let i = 2;
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    rows.push(splitRow(lines[i]));
    i++;
  }
  return { rows, aligns, consumed: i };
}

/** 块数组序列化回 markdown */
export function serializeBlocks(blocks: Block[]): string {
  return blocks.map(serializeBlock).filter((s) => s !== '').join('\n\n');
}

function serializeBlock(b: Block): string {
  switch (b.type) {
    case 'h1':
      return `# ${b.text || ''}`;
    case 'h2':
      return `## ${b.text || ''}`;
    case 'h3':
      return `### ${b.text || ''}`;
    case 'h4':
      return `#### ${b.text || ''}`;
    case 'p':
      return b.text || '';
    case 'quote':
      return (b.text || '').split('\n').map((l) => `> ${l}`).join('\n');
    case 'ul':
      return (b.items || []).map((i) => `- ${i}`).join('\n');
    case 'ol':
      return (b.items || []).map((i, idx) => `${idx + 1}. ${i}`).join('\n');
    case 'code':
      return '```' + (b.lang || '') + '\n' + (b.code || '') + '\n```';
    case 'hr':
      return '---';
    case 'table':
      return serializeTable(b);
    default:
      return '';
  }
}

function serializeTable(b: Block): string {
  const rows = b.rows || [];
  if (rows.length === 0) return '';
  const aligns = b.aligns || rows[0].map(() => 'left' as const);
  const cell = (c: string, j: number) => {
    const a = aligns[j] || 'left';
    const pad = a === 'center' ? `:${'-'.repeat(3)}:` : a === 'right' ? `${'-'.repeat(4)}:` : `${'-'.repeat(5)}`;
    return { c, a, pad };
  };
  const header = rows[0].map((c, j) => cell(c, j));
  const sep = aligns.map((a) => (a === 'center' ? ':---:' : a === 'right' ? '----:' : '-----'));
  const lines: string[] = [];
  lines.push('| ' + header.map((h) => h.c).join(' | ') + ' |');
  lines.push('| ' + sep.join(' | ') + ' |');
  for (let r = 1; r < rows.length; r++) {
    lines.push('| ' + rows[r].map((c) => c).join(' | ') + ' |');
  }
  return lines.join('\n');
}

// ============ HTML → Markdown 反序列化（contenteditable 失焦读取） ============

/** 把 contenteditable 产生的 HTML 转回 markdown 行内标记 */
export function htmlToInlineMd(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement | null;
  if (!root) return '';
  return nodesToInlineMd(root.childNodes).replace(/\n{3,}/g, '\n\n').trim();
}

function nodesToInlineMd(nodes: NodeListOf<ChildNode>): string {
  let out = '';
  nodes.forEach((node) => {
    out += nodeToInlineMd(node);
  });
  return out;
}

function nodeToInlineMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = nodesToInlineMd(el.childNodes);
  switch (tag) {
    case 'strong':
    case 'b':
      return `**${inner || ''}**`;
    case 'em':
    case 'i':
      return `*${inner || ''}*`;
    case 'code':
      return `\`${inner}\``;
    case 'a': {
      const href = el.getAttribute('href') || '';
      return `[${inner}](${href})`;
    }
    case 'br':
      return '\n';
    case 'div':
    case 'p':
      return inner + '\n';
    case 'span':
    case 'font':
      // 去除样式 span/font，保留内容
      return inner;
    default:
      return inner;
  }
}

/** 创建空块（供编辑器插入新块） */
export function createBlock(type: BlockType, partial: Partial<Block> = {}): Block {
  const base: Block = { id: newBlockId(), type };
  if (type === 'ul' || type === 'ol') base.items = partial.items ?? [''];
  else if (type === 'code') base.code = partial.code ?? '';
  else if (type === 'table') {
    base.rows = partial.rows ?? [
      ['列1', '列2', '列3'],
      ['', '', ''],
    ];
    base.aligns = partial.aligns ?? ['left', 'left', 'left'];
  } else if (type !== 'hr') {
    base.text = partial.text ?? '';
  }
  return base;
}

/** 渲染单块的 HTML（用于 contenteditable 初始内容） */
export function renderBlockHtml(b: Block): string {
  switch (b.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'p':
    case 'quote':
      return renderInline(b.text || '');
    case 'ul':
      return (b.items || []).map((i) => `<li>${renderInline(i)}</li>`).join('');
    case 'ol':
      return (b.items || []).map((i) => `<li>${renderInline(i)}</li>`).join('');
    case 'table': {
      const rows = b.rows || [];
      if (rows.length === 0) return '';
      const ths = rows[0].map((c, j) => `<th style="text-align:${b.aligns?.[j] || 'left'}">${renderInline(c)}</th>`).join('');
      const trs = rows.slice(1).map((r) => '<tr>' + r.map((c, j) => `<td style="text-align:${b.aligns?.[j] || 'left'}">${renderInline(c)}</td>`).join('') + '</tr>').join('');
      return `<thead><tr>${ths}</tr></thead><tbody>${trs}</tbody>`;
    }
    default:
      return '';
  }
}
