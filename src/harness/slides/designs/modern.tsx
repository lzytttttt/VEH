import { renderMarkdown } from '../../../lib/markdown';

interface Props {
  md: string;
  index: number;
  total: number;
}

/** 现代极简 design：无衬线 · 白底居中 · 色块标题 · 卡片段落 · 大留白 */
const CSS = `
.sd-modern {
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #ffffff;
  color: #1a1a2e;
  padding: 36px 44px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.sd-modern-body { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.sd-modern-body > * { max-width: 92%; }
.sd-modern h1 {
  font-size: 34px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 14px 28px;
  border-radius: 8px;
  display: inline-block;
  margin: 0 auto 18px;
  box-shadow: 0 4px 14px rgba(118,75,162,0.3);
}
.sd-modern h2 {
  font-size: 24px;
  color: #764ba2;
  border-bottom: 3px solid #667eea;
  display: inline-block;
  margin: 14px auto;
  padding-bottom: 4px;
}
.sd-modern h3 { font-size: 19px; color: #667eea; margin: 10px 0; }
.sd-modern p {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  padding: 10px 16px;
  border-radius: 4px;
  margin: 8px auto;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.sd-modern ul, .sd-modern ol { display: inline-block; text-align: left; padding-left: 24px; margin: 8px auto; }
.sd-modern ul { list-style: none; padding-left: 20px; }
.sd-modern ul li { position: relative; padding-left: 18px; margin: 6px 0; line-height: 1.6; }
.sd-modern ul li::before { content: '●'; position: absolute; left: 0; color: #667eea; font-size: 9px; top: 6px; }
.sd-modern ol li { margin: 4px 0; line-height: 1.6; }
.sd-modern blockquote {
  background: #e8f5e9;
  border-left: 4px solid #008080;
  padding: 10px 16px;
  border-radius: 4px;
  margin: 8px auto;
  font-style: italic;
  color: #004d40;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}
.sd-modern table { border-collapse: collapse; width: 92%; margin: 10px auto; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border-radius: 6px; overflow: hidden; }
.sd-modern th { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; padding: 8px 12px; font-size: 13px; }
.sd-modern td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; text-align: left; }
.sd-modern tr:nth-child(even) td { background: #f8f9fa; }
.sd-modern pre { background: #1a1a2e; color: #e0e0e0; padding: 12px 16px; border-radius: 6px; overflow: auto; font-family: 'Courier New', monospace; font-size: 12px; text-align: left; }
.sd-modern p code, .sd-modern li code { background: #ede7f6; color: #4527a0; padding: 1px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
.sd-modern hr { border: none; border-top: 1px solid #eee; margin: 16px auto; width: 60%; }
.sd-modern a { color: #667eea; text-decoration: none; border-bottom: 1px dashed #667eea; }
.sd-modern strong { color: #764ba2; }
.sd-modern-footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 8px; }
`;

export function ModernSlide({ md, index, total }: Props) {
  return (
    <>
      <style>{CSS}</style>
      <div className="sd-modern">
        <div className="sd-modern-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
        <div className="sd-modern-footer">{index + 1} / {total} · 现代极简</div>
      </div>
    </>
  );
}
