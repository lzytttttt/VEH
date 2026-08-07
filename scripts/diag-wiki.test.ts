// 诊断：为什么 getWiki 的 LLM JSON 解析失败
(globalThis as any).localStorage = {
  _d: new Map<string, string>(),
  getItem(k: string) { return this._d.get(k) ?? null; },
  setItem(k: string, v: string) { this._d.set(k, v); },
  removeItem(k: string) { this._d.delete(k); },
};
(globalThis as any).window = { setTimeout, clearTimeout };

import { chatCompletionJSON } from '../src/harness/adapters/sseUtils';

const KEY = 'sk-3EAPKicpJwXePlyKrT5csut666H2zHVirlZ0m53KYF91GB7LsYWNDCAxhV0v7jMk';
const BASE = 'https://opencode.ai/zen/go/v1';
const MODEL = 'deepseek-v4-flash';

async function rawCompletion(messages: any[], opts: any = {}) {
  const url = `${BASE}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, stream: false, ...opts }),
  });
  const data = await resp.json();
  return data;
}

(async () => {
  // 复刻 CapabilityAdapter.getWiki 的 system prompt（简化版）
  const sys = `你是教学知识图谱专家。基于课堂场景，输出符合下列结构的 JSON（不要再有其它文字）。
场景："classroom"（classroom=高中物理教室 / pe=体育课 / lab=化学实验 / workshop=实训车间 / microlesson=微课）。
JSON Schema：
{
  "nodes": [
    {
      "id": "string 唯一 id 如 n1",
      "title": "string 知识点标题",
      "category": "string 分类",
      "summary": "string 一句话摘要",
      "details": "string 3-6 段详细讲解",
      "related": ["string 关联节点 id"],
      "classroomRefs": [{"t": 秒数数字, "type": "事件类型", "label": "课堂引用片段"}]
    }
  ],
  "assistantScript": [
    { "q": "string 学生常见提问", "a": "string 回答", "keywords": ["可选关键词"] }
  ]
}
要求：
- 输出 4-7 个 nodes，按学科层级组织（力学/电磁学/...）
- 节点间相关关系通过 related 字段表达
- classroomRefs 用课堂情景引用每个节点
- assistantScript 至少 3 个常见问答
- 直接输出 JSON 对象`;

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: '为场景 "classroom" 生成知识 WIKI 容器' },
  ];

  console.log('===== A. 无 max_tokens（复刻 adapter 现状） =====');
  const r1 = await rawCompletion(messages);
  const msg1 = r1.choices?.[0]?.message ?? {};
  console.log('finish_reason:', r1.choices?.[0]?.finish_reason);
  console.log('content 长度:', (msg1.content ?? '').length);
  console.log('content 前 200:', JSON.stringify((msg1.content ?? '').slice(0, 200)));
  console.log('reasoning 长度:', (msg1.reasoning_content ?? '').length);
  try { const p = JSON.parse(msg1.content); console.log('✅ 直接解析成功, keys:', Object.keys(p)); }
  catch (e) { console.log('❌ JSON.parse 失败:', String(e).slice(0, 100)); }

  console.log('\n===== B. 带 max_tokens: 8000（排除截断因素） =====');
  const r2 = await rawCompletion(messages, { max_tokens: 8000 });
  const msg2 = r2.choices?.[0]?.message ?? {};
  console.log('finish_reason:', r2.choices?.[0]?.finish_reason);
  console.log('content 长度:', (msg2.content ?? '').length);
  console.log('reasoning 长度:', (msg2.reasoning_content ?? '').length);
  try { const p = JSON.parse(msg2.content); console.log('✅ 直接解析成功, keys:', Object.keys(p)); }
  catch (e) { console.log('❌ JSON.parse 失败:', String(e).slice(0, 100)); }

  console.log('\n===== C. chatCompletionJSON 走 adapter 的解析路径 =====');
  const parsed = await chatCompletionJSON({ baseURL: BASE, apiKey: KEY, model: MODEL, messages });
  console.log('chatCompletionJSON 结果:', parsed ? `✅ 对象 keys: ${Object.keys(parsed)}` : '❌ null');
  if (parsed) {
    console.log('nodes 数量:', (parsed as any).nodes?.length);
  }

  process.exit(0);
})();
