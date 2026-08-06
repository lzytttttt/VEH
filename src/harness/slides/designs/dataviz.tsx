import { renderMarkdown } from '../../../lib/markdown';

interface Props {
  md: string;
  index: number;
  total: number;
}

/**
 * 图表驱动 design：双栏布局（内容 + 侧栏）· 编号标题 · 底部进度条 · 表格突出 · 数据强调
 * 结构差异：左侧 72% 内容 + 右侧 28% 侧栏（进度/页码/标识），底部进度条
 */
const CSS = `
.sd-dataviz {
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sd-dataviz-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.sd-dataviz-content {
  flex: 1 1 72%;
  padding: 24px 28px;
  overflow: auto;
  border-right: 1px solid #1e293b;
}
.sd-dataviz-aside {
  flex: 0 0 26%;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #1e293b;
}
.sd-dataviz h1 {
  font-size: 24px;
  color: #38bdf8;
  border-left: 4px solid #38bdf8;
  padding-left: 12px;
  margin: 8px 0 14px;
}
.sd-dataviz h2 {
  font-size: 20px;
  color: #818cf8;
  border-left: 3px solid #818cf8;
  padding-left: 10px;
  margin: 12px 0 8px;
}
.sd-dataviz h3 { font-size: 17px; color: #c084fc; margin: 10px 0 6px; }
.sd-dataviz p { margin: 6px 0; line-height: 1.65; color: #cbd5e1; }
.sd-dataviz ul { list-style: none; padding-left: 0; margin: 6px 0; }
.sd-dataviz ul li { position: relative; padding-left: 22px; margin: 5px 0; line-height: 1.6; color: #cbd5e1; }
.sd-dataviz ul li::before { content: '▸'; position: absolute; left: 4px; color: #38bdf8; }
.sd-dataviz ol { padding-left: 24px; margin: 6px 0; }
.sd-dataviz ol li { margin: 3px 0; line-height: 1.6; color: #cbd5e1; }
.sd-dataviz ol li::marker { color: #38bdf8; font-weight: bold; }
.sd-dataviz blockquote {
  background: #1e293b;
  border-left: 4px solid #f59e0b;
  padding: 8px 14px;
  margin: 8px 0;
  color: #fcd34d;
  border-radius: 0 4px 4px 0;
}
.sd-dataviz table {
  border-collapse: collapse;
  width: 100%;
  margin: 10px 0;
  background: #1e293b;
  border-radius: 4px;
  overflow: hidden;
}
.sd-dataviz th { background: #38bdf8; color: #0f172a; padding: 6px 10px; font-size: 12px; font-weight: bold; text-align: left; }
.sd-dataviz td { padding: 6px 10px; border-bottom: 1px solid #334155; font-size: 12px; color: #e2e8f0; }
.sd-dataviz tr:nth-child(even) td { background: #0f172a; }
.sd-dataviz tr:hover td { background: #1e3a5f; }
.sd-dataviz pre { background: #000; color: #4ade80; padding: 10px 14px; border-radius: 4px; overflow: auto; font-family: 'Courier New', monospace; font-size: 12px; border-left: 3px solid #4ade80; }
.sd-dataviz p code, .sd-dataviz li code { background: #1e293b; color: #38bdf8; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
.sd-dataviz hr { border: none; border-top: 1px solid #334155; margin: 12px 0; }
.sd-dataviz a { color: #38bdf8; text-decoration: underline; }
.sd-dataviz strong { color: #f59e0b; }
.sd-dataviz-aside-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
.sd-dataviz-progress { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
.sd-dataviz-progress-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 0.3s; }
.sd-dataviz-page-num { font-size: 28px; font-weight: bold; color: #38bdf8; }
.sd-dataviz-page-num span { font-size: 14px; color: #64748b; font-weight: normal; }
.sd-dataviz-aside-hint { font-size: 10px; color: #64748b; margin-top: auto; padding-top: 8px; border-top: 1px solid #334155; }
.sd-dataviz-toc-title { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
.sd-dataviz-toc-item { font-size: 11px; color: #64748b; padding: 2px 0; }
.sd-dataviz-bottombar { height: 4px; background: #1e293b; }
.sd-dataviz-bottombar-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc); }
`;

export function DataVizSlide({ md, index, total }: Props) {
  const pct = total > 0 ? ((index + 1) / total) * 100 : 0;
  // 从 markdown 提取标题作为侧栏目录
  const titles: string[] = [];
  const titleRe = /^#{1,3}\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(md)) !== null) {
    titles.push(m[1].replace(/[*_`]/g, '').slice(0, 16));
  }
  return (
    <>
      <style>{CSS}</style>
      <div className="sd-dataviz">
        <div className="sd-dataviz-main">
          <div className="sd-dataviz-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
          <aside className="sd-dataviz-aside">
            <div>
              <div className="sd-dataviz-aside-label">进度</div>
              <div className="sd-dataviz-progress">
                <div className="sd-dataviz-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="sd-dataviz-page-num">
              {String(index + 1).padStart(2, '0')}<span> / {total}</span>
            </div>
            {titles.length > 0 && (
              <div>
                <div className="sd-dataviz-toc-title">本页结构</div>
                {titles.map((t, i) => (
                  <div key={i} className="sd-dataviz-toc-item">· {t}</div>
                ))}
              </div>
            )}
            <div className="sd-dataviz-aside-hint">图表驱动 · DataViz</div>
          </aside>
        </div>
        <div className="sd-dataviz-bottombar">
          <div className="sd-dataviz-bottombar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </>
  );
}
