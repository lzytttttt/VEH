/**
 * SSE 流式解析工具（按《VLM / LLM API 接入指南》§四）
 *
 * 适用于 OpenAI 兼容协议 / DashScope / vLLM（均为 SSE，data: {...}）。
 * 所有流式 Provider（VLM / 治理 / 门户 / 教案 / 课件）共用此工具。
 */

/** OpenAI 兼容聊天的单条消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
}

export interface ChatContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/** 读取 fetch Response 的流，逐行产出 SSE 的 data 段（已 JSON.parse） */
export async function* parseSSE<T = any>(
  resp: Response,
  signal?: AbortSignal,
): AsyncIterable<T> {
  if (!resp.body) throw new Error('Response body is empty');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以 \n\n 分隔事件，按行处理
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // 最后一行可能不完整，留到下次

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data) as T;
        } catch {
          // 非 JSON 的 data 行（如心跳），跳过
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** OpenAI 兼容 SSE 事件中提取增量文本 token */
export function extractDeltaText(chunk: any): string {
  // OpenAI / vLLM / 多数兼容服务的字段
  return chunk?.choices?.[0]?.delta?.content ?? '';
}

/** 创建 AbortController，用于 Provider.cancel() */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * 规范化 markdown：强制在 #/##/### 标题与 --- 分隔符前后补 `\n\n`，
 * 解决某些 LLM（特别是推理型）把所有 markdown 挤成一行无换行符的问题。
 *
 * 规则：
 * 1. 任意 # 1-6 标题行：前面没有 \n 时插入一个 \n\n
 * 2. 任意行仅含 ---（横线）：前后各加 \n\n
 * 3. 折叠 3+ 连续换行为 \n\n
 *
 * 注意：标题行若已经有 \n 则不动，避免重复插空行
 */
export function normalizeMarkdown(md: string): string {
  if (!md) return '';
  let s = md.replace(/\r\n/g, '\n');
  // 在 # 标题前补 \n\n（如果前面不是 \n / 行首）
  s = s.replace(/([^\n])\s*(#{1,6}\s)/g, '$1\n\n$2');
  // 在行首 # 标题前加一个 \n\n（仅前面有内容时，避免文末加多余空）
  s = s.replace(/\n(#{1,6}\s)/g, '\n\n$1');
  // HR (---) 前后补 \n\n
  s = s.replace(/([^\n])\s*(---+\s*$)/gm, '$1\n\n$2');
  s = s.replace(/(^---+\s*$\n)(?!\n)/gm, '$1\n');
  // 折叠 3+ 连续换行为 \n\n
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/**
 * 把 LLM 流式 token 包装为带 markdown 换行修复的文本流。
 * 解决 LLM 不输出 \n 导致教案/课件排版被压成一坨的问题。
 *
 * 行为：
 * - 收到含 \n 的 buf 后按行 flush，每行末尾带 \n 一起 yield（保留段落结构）
 * - 空行保留为 \n（编辑器 parseBlocks 靠空行分块）
 * - 当 buf 积累超过 300 字符仍无 \n 时，尝试 normalize 并 flush（应对 LLM 不输出 \n）
 * - 流结束时 flush 剩余 buf（normalize 后 yield）
 */
export async function* normalizeMarkdownStream(
  tokens: AsyncIterable<string>,
  signal?: AbortSignal,
): AsyncIterable<string> {
  let buf = '';
  try {
    for await (const tok of tokens) {
      if (signal?.aborted) break;
      buf += tok;
      if (buf.includes('\n')) {
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim() === '') {
            yield '\n';
          } else {
            const fixed = normalizeMarkdown(line + '\n');
            if (fixed) yield fixed;
          }
        }
      }
      // LLM 不输出 \n 时，buf 会无限增长。
      // 检测到 # 或 --- 标记时，normalize 并 flush，让用户看到分段效果
      if (buf.length > 300 && !buf.includes('\n')) {
        const normalized = normalizeMarkdown(buf);
        if (normalized !== buf) {
          buf = '';
          yield normalized;
        }
      }
    }
    if (buf.trim()) {
      const fixed = normalizeMarkdown(buf);
      if (fixed) yield fixed;
    }
  } catch (e) {
    throw e;
  }
}

/**
 * 共享：调用 OpenAI 兼容 `/chat/completions` 流式接口，逐 token yield 文本。
 *
 * 由教案/课件 Adapter 与「测试连接」按钮复用，
 * 避免重复 fetch + SSE + delta 解析逻辑。
 */
export interface StreamChatOptions {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  /** 自定义请求体覆盖项（如 temperature / max_tokens / stream 等） */
  bodyOverrides?: Record<string, unknown>;
  signal?: AbortSignal;
}

/**
 * 规范化 baseURL：剥离尾部斜杠与误填的 `/chat/completions` 后缀。
 * 让用户在面板里填以下任一形式都能工作：
 *   - `https://api.openai.com/v1`
 *   - `https://api.openai.com/v1/`
 *   - `https://api.openai.com/v1/chat/completions`（误填完整端点）
 *   - `/api/llm`（推荐：走 Vite 代理避 CORS）
 *   - `/api/llm/`
 */
export function normalizeBaseURL(url: string): string {
  let u = (url ?? '').trim().replace(/\/+$/, '');
  const suffix = '/chat/completions';
  if (u.toLowerCase().endsWith(suffix.toLowerCase())) {
    u = u.slice(0, -suffix.length);
  }
  return u;
}

/** 拼出最终请求 URL（供测试按钮在 UI 显示真实地址用） */
export function buildChatCompletionsURL(baseURL: string): string {
  return `${normalizeBaseURL(baseURL)}/chat/completions`;
}

export async function* streamChatCompletion(
  opts: StreamChatOptions,
): AsyncIterable<string> {
  const url = buildChatCompletionsURL(opts.baseURL);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
      ...(opts.bodyOverrides ?? {}),
    }),
    signal: opts.signal,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`LLM API ${resp.status} ${resp.statusText}: ${body.slice(0, 500)}`);
  }

  for await (const chunk of parseSSE(resp, opts.signal)) {
    const token = extractDeltaText(chunk);
    if (token) yield token;
  }
}

/**
 * 共享：调用 OpenAI 兼容 `/chat/completions` 非流式接口，用于连接测试。
 * 返回 assistant 输出的完整文本（截断到 200 字符内以便 UI 展示）。
 */
export async function testChatCompletion(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  signal?: AbortSignal;
}): Promise<{ ok: true; preview: string; elapsedMs: number; url: string } | { ok: false; error: string; elapsedMs: number; url: string }> {
  const start = performance.now();
  const url = buildChatCompletionsURL(opts.baseURL);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 16,
        stream: false,
      }),
      signal: opts.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      return { ok: false, error: `${resp.status} ${resp.statusText}: ${body.slice(0, 300)}`, elapsedMs: performance.now() - start, url };
    }
    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    return { ok: true, preview: content.slice(0, 200), elapsedMs: performance.now() - start, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 浏览器把 CORS/网络错误统一报 "Failed to fetch"，给用户更明确的诊断
    const hint = /Failed to fetch/i.test(msg) && !url.startsWith('/')
      ? `（疑似 CORS：浏览器禁止跨源直连，请改用 /api/llm 代理）`
      : '';
    return { ok: false, error: `${msg}${hint}`, elapsedMs: performance.now() - start, url };
  }
}

/**
 * 调用 LLM 拿结构化 JSON 输出（用于 WIKI / 模拟演练 / 游戏等结构化数据）。
 *
 * 防御性解析：LLM 经常在 JSON 前后夹文字或代码块，会尝试多种提取：
 * 1. 走 OpenAI 兼容 response_format=json_object（部分服务支持）
 * 2. 直接 JSON.parse
 * 3. 提取 ```json ... ``` 代码块
 * 4. 提取首个 { ... } 子串
 *
 * 解析失败返回 null（调用方决定降级到 Mock）。
 */
export async function chatCompletionJSON<T = unknown>(opts: {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<T | null> {
  const url = buildChatCompletionsURL(opts.baseURL);
  try {
    // 第一次尝试：response_format=json_object
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: opts.signal,
    });
    if (!resp.ok) {
      // 第二次尝试：不带 response_format（某些兼容服务不支持）
      const resp2 = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          stream: false,
        }),
        signal: opts.signal,
      });
      if (!resp2.ok) return null;
      const data2 = await resp2.json();
      return extractJSON<T>(data2?.choices?.[0]?.message?.content ?? '');
    }
    const data = await resp.json();
    return extractJSON<T>(data?.choices?.[0]?.message?.content ?? '');
  } catch {
    return null;
  }
}

/** 多策略从 LLM 输出中抽取 JSON */
function extractJSON<T>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1. 直接 parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {/* keep trying */}

  // 2. ```json ... ``` 代码块
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim()) as T;
    } catch {/* keep trying */}
  }

  // 3. 首个 { ... } 或 [ ... ]（贪心匹配到对应结尾）
  for (const opener of ['{', '[']) {
    const closer = opener === '{' ? '}' : ']';
    const start = trimmed.indexOf(opener);
    if (start === -1) continue;
    // 从内向外尝试匹配嵌套
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        depth--;
        if (depth === 0) {
          const candidate = trimmed.slice(start, i + 1);
          try {
            return JSON.parse(candidate) as T;
          } catch {/* keep trying */}
          break;
        }
      }
    }
  }

  return null;
}
