import { useEffect, useState } from 'react';
import WysiwygEditor from '../components/WysiwygEditor';
import ContentGenAssistant from '../components/ContentGenAssistant';
import { getSlidesGenProvider } from '../harness/slides';
import { renderSlide, SLIDE_DESIGNS } from '../harness/slides/designs';
import type { SlideDesign } from '../harness/slides';
import { renderMarkdown, splitSlides } from '../lib/markdown';
import {
  createSlideDeck,
  deleteSlideDeck,
  listSlideDecks,
  saveSlideDeck,
  type SlideDeckRecord,
} from '../data/slides';

const provider = getSlidesGenProvider();

/** 缩略图简化渲染（去掉 design 装饰，只看内容结构） */
function simpleThumbRender(md: string): string {
  return renderMarkdown(md);
}

/**
 * 课件工具（Slides Deck）— 教师角色
 * 三栏布局：Deck 列表 · 编辑+预览 · 生成助手 Agent
 * - 使用 slides 独立 harness（与教案 harness 物理隔离）
 * - 3 套 design 切换（classic/modern/dataviz，结构/排版/装饰均有实质差异）
 * - 演示模式：自定义 React 全屏 + 键盘翻页（←/→/Space/Esc/S 备注切换）+ 进度条
 */
export default function SlidesApp() {
  const [decks, setDecks] = useState<SlideDeckRecord[]>(() => listSlideDecks());
  const [selectedId, setSelectedId] = useState<string>(() => decks[0]?.id ?? '');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [design, setDesign] = useState<SlideDesign>('classic');
  const [showPresent, setShowPresent] = useState(false);
  const [notesView, setNotesView] = useState(false);

  const current = decks.find((d) => d.id === selectedId) ?? null;

  const updateCurrent = (patch: Partial<SlideDeckRecord>) => {
    if (!current) return;
    const updated: SlideDeckRecord = { ...current, ...patch, updatedAt: Date.now() };
    saveSlideDeck(updated);
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleNew = () => {
    const d = createSlideDeck('新建课件');
    setDecks((prev) => [d, ...prev]);
    setSelectedId(d.id);
    setCurrentIndex(0);
  };

  const handleDelete = (id: string) => {
    deleteSlideDeck(id);
    const remaining = decks.filter((d) => d.id !== id);
    setDecks(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id ?? '');
      setCurrentIndex(0);
    }
  };

  const updateSlide = (i: number, md: string) => {
    if (!current) return;
    const slides = [...current.slides];
    slides[i] = md;
    updateCurrent({ slides });
  };
  const updateNote = (i: number, note: string) => {
    if (!current) return;
    const notes = [...current.notes];
    notes[i] = note;
    const updated: SlideDeckRecord = { ...current, notes, updatedAt: Date.now() };
    saveSlideDeck(updated);
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const addSlide = () => {
    if (!current) return;
    updateCurrent({ slides: [...current.slides, '# 新幻灯片\n\n'], notes: [...current.notes, ''] });
    setCurrentIndex(current.slides.length);
  };
  const deleteSlide = (i: number) => {
    if (!current || current.slides.length <= 1) return;
    const slides = current.slides.filter((_, idx) => idx !== i);
    const notes = current.notes.filter((_, idx) => idx !== i);
    updateCurrent({ slides, notes });
    if (currentIndex >= slides.length) setCurrentIndex(slides.length - 1);
  };
  const moveSlide = (i: number, dir: -1 | 1) => {
    if (!current) return;
    const j = i + dir;
    if (j < 0 || j >= current.slides.length) return;
    const slides = [...current.slides];
    const notes = [...current.notes];
    [slides[i], slides[j]] = [slides[j], slides[i]];
    [notes[i], notes[j]] = [notes[j], notes[i]];
    updateCurrent({ slides, notes });
    setCurrentIndex(j);
  };

  const currentSlideMd = current?.slides[currentIndex] ?? '';
  const currentNote = current?.notes[currentIndex] ?? '';
  const total = current?.slides.length ?? 0;

  useEffect(() => {
    if (!showPresent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, total - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        setShowPresent(false);
      } else if (e.key === 's' || e.key === 'S') {
        setNotesView((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showPresent, total]);

  return (
    <div className="flex h-full bg-win-gray" style={{ gap: '4px', padding: '4px' }}>
      {/* 左栏：Deck 列表 */}
      <div className="flex flex-col gap-1" style={{ width: '170px', flexShrink: 0 }}>
        <div className="win-text-bold" style={{ fontSize: '11px', color: '#000080' }}>
          🎬 课件列表 ({decks.length})
        </div>
        <button className="win-button" onClick={handleNew} style={{ fontSize: '11px', padding: '3px 8px' }}>
          ＋ 新建课件
        </button>
        <div className="win-sunken flex-1" style={{ padding: '4px', overflow: 'auto' }}>
          {decks.length === 0 && (
            <div style={{ fontSize: '11px', color: '#808080', fontStyle: 'italic' }}>▌暂无课件</div>
          )}
          {decks.map((d) => (
            <div
              key={d.id}
              onClick={() => {
                setSelectedId(d.id);
                setCurrentIndex(0);
              }}
              className="win-raised"
              style={{
                padding: '4px 6px',
                marginBottom: '3px',
                cursor: 'pointer',
                background: d.id === selectedId ? '#000080' : '#c0c0c0',
                color: d.id === selectedId ? '#fff' : '#000',
                fontSize: '11px',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title || '（无标题）'}
                </span>
                <button
                  className="win-button"
                  style={{ minWidth: '18px', padding: '0 4px', fontSize: '10px', height: '16px', background: '#c0c0c0', color: '#000' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(d.id);
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>{d.slides.length} 页 · {d.subject}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 中栏：编辑 + 预览 */}
      <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
        {current ? (
          <>
            <div className="flex gap-1 flex-wrap">
              <input
                className="win-input flex-1"
                value={current.title}
                onChange={(e) => updateCurrent({ title: e.target.value })}
                placeholder="课件标题"
                style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '120px' }}
              />
              <input
                className="win-input"
                value={current.topic}
                onChange={(e) => updateCurrent({ topic: e.target.value })}
                placeholder="课题"
                style={{ fontSize: '11px', width: '110px' }}
              />
              <select
                className="win-input"
                value={current.subject}
                onChange={(e) => updateCurrent({ subject: e.target.value })}
                style={{ fontSize: '11px', width: '60px' }}
              >
                <option value="数学">数学</option>
                <option value="物理">物理</option>
                <option value="化学">化学</option>
                <option value="语文">语文</option>
                <option value="英语">英语</option>
                <option value="体育">体育</option>
                <option value="实训">实训</option>
              </select>
              <button
                className="win-button is-default"
                onClick={() => setShowPresent(true)}
                style={{ fontSize: '11px', padding: '2px 12px', fontWeight: 'bold' }}
                title="进入演示模式（←/→ 翻页，S 演讲者备注，Esc 退出）"
              >
                ▶ 演示
              </button>
            </div>

            {/* Design 切换器 */}
            <div className="win-raised-thin flex items-center gap-1" style={{ padding: '3px 6px' }}>
              <span style={{ fontSize: '10px', color: '#000080', fontWeight: 'bold' }}>🎨 Design:</span>
              {SLIDE_DESIGNS.map((d) => (
                <button
                  key={d.id}
                  className="win-button"
                  title={d.description}
                  onClick={() => setDesign(d.id)}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: design === d.id ? '#000080' : undefined,
                    color: design === d.id ? '#fff' : undefined,
                    fontWeight: design === d.id ? 'bold' : 'normal',
                  }}
                >
                  {d.name}
                </button>
              ))}
              <span style={{ fontSize: '9px', color: '#808080', marginLeft: '4px', flex: 1 }}>
                {SLIDE_DESIGNS.find((d) => d.id === design)?.description}
              </span>
            </div>

            {/* 幻灯片缩略图横向列表 */}
            <div className="win-sunken" style={{ padding: '4px', overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: '4px', height: '64px' }}>
              {current.slides.map((md, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    flex: '0 0 90px',
                    height: '56px',
                    background: '#fff',
                    border: i === currentIndex ? '2px solid #000080' : '1px solid #808080',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    fontSize: '6px',
                    lineHeight: '1.1',
                  }}
                  title={`第 ${i + 1} 页`}
                >
                  <div style={{ height: '100%', overflow: 'hidden', padding: '2px' }} dangerouslySetInnerHTML={{ __html: simpleThumbRender(md) }} />
                  <span style={{ position: 'absolute', bottom: 0, right: 2, fontSize: '8px', fontWeight: 'bold', background: '#000080', color: '#fff', padding: '0 2px' }}>
                    {i + 1}
                  </span>
                </div>
              ))}
              <button className="win-button" onClick={addSlide} style={{ flex: '0 0 36px', height: '56px', fontSize: '14px', padding: 0 }} title="新增幻灯片">＋</button>
            </div>

            {/* 主体：design 预览 + 编辑器 */}
            <div className="flex gap-1" style={{ flex: 1, minHeight: 0 }}>
              {/* Design 预览（体现 design 差异） */}
              <div className="win-sunken" style={{ flex: '0 0 42%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '10px', color: '#000080', padding: '3px 6px', background: '#c0c0c0', fontWeight: 'bold' }}>
                  👁 Design 预览（{SLIDE_DESIGNS.find((d) => d.id === design)?.name}）
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  {renderSlide(design, { md: currentSlideMd, index: currentIndex, total })}
                </div>
              </div>

              {/* 编辑器 + 备注 */}
              <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center justify-between" style={{ fontSize: '10px', color: '#000080' }}>
                  <span>✏ 第 {currentIndex + 1} / {total} 页 · 编辑（所见即所得）</span>
                  <div className="flex gap-px">
                    <button className="win-button" onClick={() => moveSlide(currentIndex, -1)} disabled={currentIndex === 0} style={{ fontSize: '10px', padding: '1px 6px', minWidth: '22px' }} title="左移">◀</button>
                    <button className="win-button" onClick={() => moveSlide(currentIndex, 1)} disabled={currentIndex === total - 1} style={{ fontSize: '10px', padding: '1px 6px', minWidth: '22px' }} title="右移">▶</button>
                    <button className="win-button" onClick={() => deleteSlide(currentIndex)} disabled={total <= 1} style={{ fontSize: '10px', padding: '1px 6px', minWidth: '22px' }} title="删除当前页">×</button>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <WysiwygEditor
                    value={currentSlideMd}
                    onChange={(v) => updateSlide(currentIndex, v)}
                    placeholder="编辑本页幻灯片（工具栏切换段落/标题/列表/引用/表格/代码）..."
                  />
                </div>
                <textarea
                  className="win-input"
                  style={{ height: '48px', fontSize: '11px', resize: 'none', lineHeight: '1.4' }}
                  placeholder="📝 演讲者备注（演示时按 S 键查看）..."
                  value={currentNote}
                  onChange={(e) => updateNote(currentIndex, e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="win-sunken flex-1 flex items-center justify-center" style={{ fontSize: '12px', color: '#808080', fontStyle: 'italic' }}>
            ▌ 请点击左侧「新建课件」开始
          </div>
        )}
      </div>

      {/* 右栏：生成助手 Agent */}
      <div style={{ width: '270px', flexShrink: 0 }}>
        {current ? (
          <ContentGenAssistant
            provider={provider}
            kind="slides"
            currentContent={current.slides.join('\n\n---\n\n')}
            defaultTopic={current.topic}
            defaultSubject={current.subject}
            buildDraftInput={(topic, subject) => ({ topic, subject, design })}
            buildChatInput={(query, content) => ({ currentContent: content, query, design })}
            onInsert={(text, mode) => {
              if (!current) return;
              const newSlides = splitSlides(text);
              if (mode === 'replace') {
                updateCurrent({ slides: newSlides.length ? newSlides : [''], notes: newSlides.map(() => '') });
                setCurrentIndex(0);
              } else {
                const startIdx = current.slides.length;
                updateCurrent({
                  slides: [...current.slides, ...newSlides],
                  notes: [...current.notes, ...newSlides.map(() => '')],
                });
                setCurrentIndex(startIdx);
              }
            }}
          />
        ) : (
          <div className="win-sunken h-full flex items-center justify-center" style={{ fontSize: '11px', color: '#808080' }}>
            ▌选择课件后启用助手
          </div>
        )}
      </div>

      {/* 演示模式 Overlay（自定义 React，3 套 design 渲染） */}
      {showPresent && current && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '24px', background: '#000080', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', fontSize: '11px', flexShrink: 0 }}>
            <span>▶ 演示 · {current.title} · {SLIDE_DESIGNS.find((d) => d.id === design)?.name}</span>
            <div className="flex gap-1">
              <button className="win-button" onClick={() => setNotesView((v) => !v)} style={{ fontSize: '10px', padding: '0 8px', minWidth: '40px' }} title="按 S 切换">📝 备注</button>
              <button className="win-button" onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} disabled={currentIndex === 0} style={{ fontSize: '10px', padding: '0 8px', minWidth: '40px' }}>◀ 上一页</button>
              <button className="win-button" onClick={() => setCurrentIndex((i) => Math.min(i + 1, total - 1))} disabled={currentIndex === total - 1} style={{ fontSize: '10px', padding: '0 8px', minWidth: '40px' }}>下一页 ▶</button>
              <button className="win-button is-default" onClick={() => setShowPresent(false)} style={{ fontSize: '10px', padding: '0 8px', minWidth: '60px', fontWeight: 'bold' }}>✕ 退出</button>
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              {renderSlide(design, { md: current.slides[currentIndex], index: currentIndex, total })}
            </div>
            {notesView && (
              <div style={{ position: 'absolute', right: 12, top: 12, width: '280px', maxHeight: '70%', background: '#ffffe0', border: '2px solid #000080', padding: '10px 12px', fontSize: '12px', lineHeight: '1.6', overflow: 'auto', boxShadow: '2px 2px 8px rgba(0,0,0,0.4)' }}>
                <div style={{ fontSize: '10px', color: '#000080', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #000080', paddingBottom: '3px' }}>
                  📝 演讲者备注 · 第 {currentIndex + 1} 页
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{current.notes[currentIndex] || '（无备注）'}</div>
                <div style={{ fontSize: '10px', color: '#808080', marginTop: '8px', paddingTop: '6px', borderTop: '1px dotted #808080' }}>
                  ←/→ 翻页 · S 切换备注 · Esc 退出
                </div>
              </div>
            )}
          </div>
          <div style={{ height: '6px', background: '#1a1a2e', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ height: '20px', background: '#000', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
            <span>第 {currentIndex + 1} / {total} 页</span>
            <span style={{ color: '#808080' }}>←/→ 翻页 · Space 下一页 · S 备注 · Esc 退出</span>
          </div>
        </div>
      )}
    </div>
  );
}
