import { useState } from 'react';
import { listNotes, saveNote, deleteNote, type NoteRecord } from '../data/localStorage';

interface NoteItem extends NoteRecord {}

const SEED_NOTES: NoteItem[] = listNotes().map((n) => ({ ...n }));

export default function NotesApp() {
  const [notes, setNotes] = useState<NoteItem[]>(SEED_NOTES);
  const [newContent, setNewContent] = useState('');
  const [newScenario, setNewScenario] = useState('classroom');

  const pinned = notes.filter((n) => n.pinned);
  const others = notes.filter((n) => !n.pinned);

  const addNote = () => {
    if (!newContent.trim()) return;
    const scenarioLabels: Record<string, string> = {
      classroom: '🏫 物理·牛顿第二定律',
      pe: '⚽ 体育·篮球运球',
      lab: '🔬 化学·酸碱中和滴定',
      workshop: '🏭 实训·普通车削',
      microlesson: '🎥 数学·函数单调性',
    };
    const newNote: NoteItem = {
      id: `n${Date.now()}`,
      scenarioId: newScenario,
      scenarioLabel: scenarioLabels[newScenario],
      t: 0,
      content: newContent.trim(),
      pinned: false,
      createdAt: Date.now(),
    };
    saveNote(newNote);
    setNotes((prev) => [newNote, ...prev]);
    setNewContent('');
  };

  const togglePin = (id: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
      const updated = next.find((n) => n.id === id);
      if (updated) saveNote(updated);
      return next;
    });
  };

  const deleteNoteHandler = (id: string) => {
    deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-win-gray p-2 gap-2">
      <div className="win-text-bold" style={{ fontSize: '13px' }}>📝 我的课堂笔记</div>

      {/* 新建 */}
      <div className="win-fieldset">
        <legend>新建笔记</legend>
        <div className="flex flex-col gap-2">
          <select
            className="win-input"
            value={newScenario}
            onChange={(e) => setNewScenario(e.target.value)}
            style={{ fontSize: '11px' }}
          >
            <option value="classroom">🏫 物理·牛顿第二定律</option>
            <option value="pe">⚽ 体育·篮球运球</option>
            <option value="lab">🔬 化学·酸碱中和滴定</option>
            <option value="workshop">🏭 实训·普通车削</option>
            <option value="microlesson">🎥 数学·函数单调性</option>
          </select>
          <textarea
            className="win-input"
            placeholder="记录笔记内容..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            style={{ fontSize: '12px', minHeight: '60px', resize: 'none' }}
          />
          <div className="flex justify-end">
            <button className="win-button" onClick={addNote} disabled={!newContent.trim()} style={{ fontSize: '11px', padding: '2px 12px' }}>
              ＋ 添加
            </button>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-auto">
        {pinned.length > 0 && (
          <>
            <div className="win-text-bold mb-1" style={{ fontSize: '11px', color: '#000080' }}>📌 置顶 ({pinned.length})</div>
            {pinned.map((n) => (
              <NoteCard key={n.id} note={n} onTogglePin={togglePin} onDelete={deleteNoteHandler} />
            ))}
          </>
        )}
        <div className="win-text-bold mt-2 mb-1" style={{ fontSize: '11px', color: '#808080' }}>其他笔记 ({others.length})</div>
        {others.map((n) => (
          <NoteCard key={n.id} note={n} onTogglePin={togglePin} onDelete={deleteNoteHandler} />
        ))}
        {others.length === 0 && pinned.length === 0 && (
          <div className="win-sunken p-2 text-gray-500 italic" style={{ fontSize: '11px' }}>
            ▌暂无笔记
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, onTogglePin, onDelete }: {
  note: NoteItem;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="win-raised p-2 mb-1" style={{ background: note.pinned ? '#ffffe0' : '#c0c0c0' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '10px', color: '#808080' }}>{note.scenarioLabel} · t={note.t}s</span>
        <div className="flex gap-1">
          <button className="win-button" style={{ padding: '0 4px', fontSize: '10px', minWidth: '20px' }} onClick={() => onTogglePin(note.id)} title={note.pinned ? '取消置顶' : '置顶'}>
            📌
          </button>
          <button className="win-button" style={{ padding: '0 4px', fontSize: '10px', minWidth: '20px' }} onClick={() => onDelete(note.id)} title="删除">
            ×
          </button>
        </div>
      </div>
      <div className="win-text" style={{ fontSize: '12px', lineHeight: '1.5' }}>{note.content}</div>
    </div>
  );
}
