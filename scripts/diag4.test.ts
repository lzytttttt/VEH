import { normalizeMarkdown } from '../src/harness/adapters/sseUtils';
import { parseBlocks } from '../src/lib/markdown';

const md = '#函数单调性判定\n##一、教学目标\n###知识与技能\n- 理解概念\n\n##二、教学重难点\n###重点\n- 定义法';
const normalized = normalizeMarkdown(md);
console.log('normalize 后:');
console.log(normalized.split('\n').slice(0, 8).map(l => JSON.stringify(l)).join('\n'));
const blocks = parseBlocks(normalized);
console.log('\nparseBlocks 识别:');
blocks.forEach((b: any) => console.log(' ', `${b.type}${'level' in b ? b.level : ''}:${(b.text ?? '').toString().slice(0, 12)}`));
const ok = blocks.some((b: any) => b.type === 'h1') && blocks.some((b: any) => b.type === 'h2') && blocks.some((b: any) => b.type === 'h3');
console.log(ok ? '\n✅ 标题被正确识别为块' : '\n❌ 标题未识别');
process.exit(ok ? 0 : 1);
