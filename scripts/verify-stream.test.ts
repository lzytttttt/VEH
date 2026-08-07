// 验证 normalizeMarkdownStream：LLM 输出无换行时不再憋到流结束
import { normalizeMarkdownStream, normalizeMarkdown } from '../src/harness/adapters/sseUtils';

async function collect(tokens: string[]): Promise<string> {
  const out: string[] = [];
  for await (const piece of normalizeMarkdownStream(tokens as unknown as AsyncIterable<string>)) {
    out.push(piece);
  }
  return out.join('');
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name} ${detail ?? ''}`); }
}

// 场景 1：正常带换行的 markdown
(async () => {
  const r1 = await collect(['# 教学目标\n', '\n', '- 掌握概念\n', '\n', '## 教学过程\n']);
  check('带换行流保持结构', r1.includes('# 教学目标') && r1.includes('## 教学过程'), r1.slice(0, 80));

  // 场景 2：无换行长文本（旧 bug：憋到流结束才输出）→ 新逻辑 300 字符强制 flush
  const longNoNewline = '这是第一段内容'.repeat(40); // 320 字无换行
  const r2 = await collect([longNoNewline, '### 标题出现', '后面还有内容']);
  check('无换行长文本被分段输出（>300 字符触发 flush）', r2.length > 0 && r2.includes('标题出现'), `len=${r2.length}`);

  // 场景 3：全程无换行超长输出（模拟 LLM 无 \n 的极端情况）
  const huge = 'x'.repeat(2000);
  const r3 = await collect([huge]);
  check('2000 字符无换行也能全部输出', r3.length >= 2000, `len=${r3.length}`);

  // 场景 4：标题出现在无换行流中立即 flush
  const r4 = await collect(['普通文本', '## 一、教学目标', '内容1内容2内容3']);
  check('检测到标题标记立即 flush', r4.includes('教学目标'), r4.slice(0, 60));

  // 场景 5：--- 分隔符正常处理
  const r5 = await collect(['第1页', '\n---\n', '第2页']);
  check('--- 分隔符保留', r5.includes('---'), r5.slice(0, 60));

  // 场景 6：normalizeMarkdown 单测（标题前补空行）
  const md = normalizeMarkdown('# 标题\n正文');
  check('normalizeMarkdown 标题前补空行', md.startsWith('# 标题') && md.includes('\n\n正文'), JSON.stringify(md.slice(0, 40)));

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
