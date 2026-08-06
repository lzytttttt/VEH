import { renderMarkdown } from '../../../lib/markdown';

interface Props {
  md: string;
  index: number;
  total: number;
}

/** 经典板书 design：衬线字体 · 纸张底色 · 标题下划线 · 列表 ▸ · 引用粗左边框 */
const CSS = `
.sd-classic {
  font-family: 'Georgia', 'KaiTi', 'STKaiti', '楷体', serif;
  background: #f5f0e6;
  color: #2c2418;
  padding: 28px 36px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background-image: repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,69,19,0.06) 31px, rgba(139,69,19,0.06) 32px);
}
.sd-classic-body { flex: 1; }
.sd-classic h1, .sd-classic h2, .sd-classic h3, .sd-classic h4 {
  border-bottom: 2px solid #2c2418;
  padding-bottom: 3px;
  margin: 10px 0 8px;
  position: relative;
}
.sd-classic h1 { font-size: 26px; }
.sd-classic h1::after { content: ''; position: absolute; left: 0; bottom: -2px; width: 40%; border-bottom: 2px solid #8b4513; }
.sd-classic h2 { font-size: 21px; }
.sd-classic h3 { font-size: 17px; border-bottom: 1px dashed #8b4513; }
.sd-classic p { margin: 6px 0; line-height: 1.7; }
.sd-classic ul { list-style: none; padding-left: 0; }
.sd-classic ul li { position: relative; padding-left: 20px; margin: 4px 0; line-height: 1.6; }
.sd-classic ul li::before { content: '▸'; position: absolute; left: 0; color: #8b4513; font-weight: bold; }
.sd-classic ol { padding-left: 28px; margin: 6px 0; }
.sd-classic ol li { margin: 3px 0; line-height: 1.6; }
.sd-classic blockquote {
  border-left: 4px solid #2c2418;
  background: #ede4d0;
  padding: 8px 14px;
  margin: 8px 0;
  font-style: italic;
  color: #5c4a30;
}
.sd-classic table { border-collapse: collapse; width: 100%; margin: 8px 0; }
.sd-classic th, .sd-classic td { border: 1px solid #2c2418; padding: 4px 8px; font-size: 13px; }
.sd-classic th { background: #ede4d0; font-weight: bold; }
.sd-classic pre { background: #2c2418; color: #f5f0e6; padding: 8px 12px; border-radius: 2px; overflow: auto; font-family: 'Courier New', monospace; font-size: 12px; }
.sd-classic p code, .sd-classic li code { background: #ede4d0; padding: 1px 4px; font-family: 'Courier New', monospace; }
.sd-classic hr { border: none; border-top: 2px double #8b4513; margin: 12px 0; }
.sd-classic a { color: #8b4513; text-decoration: underline; }
.sd-classic strong { font-weight: bold; }
.sd-classic-footer { text-align: center; font-size: 11px; color: #8b4513; margin-top: 8px; font-style: italic; }
`;

export function ClassicSlide({ md, index, total }: Props) {
  return (
    <>
      <style>{CSS}</style>
      <div className="sd-classic">
        <div className="sd-classic-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
        <div className="sd-classic-footer">— 第 {index + 1} / {total} 页 · 经典板书 —</div>
      </div>
    </>
  );
}
