import { useState } from 'react';
import WysiwygEditor from '../components/WysiwygEditor';
import ContentGenAssistant from '../components/ContentGenAssistant';
import { getLessonPlanGenProvider } from '../harness/lessonPlan';
import { normalizeMarkdown } from '../harness/adapters/sseUtils';
import {
  createLessonPlan,
  deleteLessonPlan,
  listLessonPlans,
  saveLessonPlan,
  type LessonPlanRecord,
} from '../data/lessonPlans';

const provider = getLessonPlanGenProvider();

/**
 * 教案工具（Lesson Plan）— 教师角色
 * 三栏布局：文档列表 · WYSIWYG 所见即所得编辑器 · 生成助手 Agent
 * - 使用 lessonPlan 独立 harness（与课件 harness 物理隔离）
 * - WysiwygEditor：预览即编辑，工具栏完整（块类型/行内格式/块操作）
 */
export default function LessonPlanApp() {
  const [plans, setPlans] = useState<LessonPlanRecord[]>(() => listLessonPlans());
  const [selectedId, setSelectedId] = useState<string>(() => plans[0]?.id ?? '');

  const current = plans.find((p) => p.id === selectedId) ?? null;

  const updateCurrent = (patch: Partial<LessonPlanRecord>) => {
    if (!current) return;
    const updated: LessonPlanRecord = { ...current, ...patch, updatedAt: Date.now() };
    saveLessonPlan(updated);
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleNew = () => {
    const p = createLessonPlan('新建教案');
    setPlans((prev) => [p, ...prev]);
    setSelectedId(p.id);
  };

  const handleDelete = (id: string) => {
    deleteLessonPlan(id);
    const remaining = plans.filter((p) => p.id !== id);
    setPlans(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? '');
  };

  return (
    <div className="flex h-full bg-win-gray" style={{ gap: '4px', padding: '4px' }}>
      {/* 左栏：文档列表 */}
      <div className="flex flex-col gap-1" style={{ width: '170px', flexShrink: 0 }}>
        <div className="win-text-bold" style={{ fontSize: '11px', color: '#000080' }}>
          📚 教案列表 ({plans.length})
        </div>
        <button className="win-button" onClick={handleNew} style={{ fontSize: '11px', padding: '3px 8px' }}>
          ＋ 新建教案
        </button>
        <div className="win-sunken flex-1" style={{ padding: '4px', overflow: 'auto' }}>
          {plans.length === 0 && (
            <div style={{ fontSize: '11px', color: '#808080', fontStyle: 'italic' }}>▌暂无教案</div>
          )}
          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="win-raised"
              style={{
                padding: '4px 6px',
                marginBottom: '3px',
                cursor: 'pointer',
                background: p.id === selectedId ? '#000080' : '#c0c0c0',
                color: p.id === selectedId ? '#fff' : '#000',
                fontSize: '11px',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title || '（无标题）'}
                </span>
                <button
                  className="win-button"
                  style={{ minWidth: '18px', padding: '0 4px', fontSize: '10px', height: '16px', background: '#c0c0c0', color: '#000' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(p.id);
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>
                {p.subject} · {new Date(p.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 中栏：WYSIWYG 编辑器 */}
      <div className="flex flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
        {current ? (
          <>
            <div className="flex gap-1">
              <input
                className="win-input flex-1"
                value={current.title}
                onChange={(e) => updateCurrent({ title: e.target.value })}
                placeholder="教案标题"
                style={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <input
                className="win-input"
                value={current.topic}
                onChange={(e) => updateCurrent({ topic: e.target.value })}
                placeholder="课题"
                style={{ fontSize: '11px', width: '140px' }}
              />
              <select
                className="win-input"
                value={current.subject}
                onChange={(e) => updateCurrent({ subject: e.target.value })}
                style={{ fontSize: '11px', width: '80px' }}
              >
                <option value="数学">数学</option>
                <option value="物理">物理</option>
                <option value="化学">化学</option>
                <option value="语文">语文</option>
                <option value="英语">英语</option>
                <option value="体育">体育</option>
                <option value="实训">实训</option>
              </select>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <WysiwygEditor
                value={current.content}
                onChange={(v) => updateCurrent({ content: v })}
                placeholder="点击开始输入教案（工具栏切换段落/标题/列表/引用/表格/代码/分割线，行内可加粗/斜体/代码/链接）..."
              />
            </div>
          </>
        ) : (
          <div className="win-sunken flex-1 flex items-center justify-center" style={{ fontSize: '12px', color: '#808080', fontStyle: 'italic' }}>
            ▌ 请点击左侧「新建教案」开始
          </div>
        )}
      </div>

      {/* 右栏：生成助手 Agent（显眼位置） */}
      <div style={{ width: '270px', flexShrink: 0 }}>
        {current ? (
          <ContentGenAssistant
            provider={provider}
            kind="lesson_plan"
            currentContent={current.content}
            defaultTopic={current.topic}
            defaultSubject={current.subject}
            buildDraftInput={(topic, subject) => ({ topic, subject, duration: 45 })}
            buildChatInput={(query, content) => ({ currentContent: content, query })}
            onInsert={(text, mode) => {
              if (!current) return;
              const normalized = normalizeMarkdown(text);
              const newContent = mode === 'replace' ? normalized : current.content + '\n\n' + normalized;
              updateCurrent({ content: newContent });
            }}
          />
        ) : (
          <div className="win-sunken h-full flex items-center justify-center" style={{ fontSize: '11px', color: '#808080' }}>
            ▌选择教案后启用助手
          </div>
        )}
      </div>
    </div>
  );
}
