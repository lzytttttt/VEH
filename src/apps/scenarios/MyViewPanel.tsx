import type { StudentObservation, WikiNode } from '../../harness/types';
import StudentTimeline from '../../components/StudentTimeline';

interface Props {
  student: StudentObservation | null;
  wikiNodes: WikiNode[];
  currentTime: number;
  onSeek: (t: number) => void;
  onOpenWiki?: (nodeId: string) => void;
}

/**
 * 学生视角：聚焦自己的"我的视角"面板
 * - 自己的注意度时间线
 * - 涉及本节课的知识点（含掌握度）
 * - 个性化学习建议
 */
export default function MyViewPanel({ student, wikiNodes, currentTime, onSeek, onOpenWiki }: Props) {
  if (!student) {
    return (
      <div className="p-3 text-gray-500 italic" style={{ fontSize: '12px' }}>
        ▌当前登录的学生身份未匹配到本课堂数据
      </div>
    );
  }

  // 模拟知识点掌握度（基于本节课注意度均值）
  const avgAttention = student.timeline.reduce((sum, p) => sum + p.attention, 0) / student.timeline.length;
  return (
    <div className="h-full overflow-auto p-2 flex flex-col gap-2">
      <div className="win-sunken p-2" style={{ background: '#ffffe0', fontSize: '11px', lineHeight: '1.5' }}>
        <div className="win-text-bold mb-1" style={{ color: '#000080' }}>🎯 我的本节课表现</div>
        平均注意度 <strong>{(avgAttention * 100).toFixed(0)}%</strong>，{avgAttention >= 0.8 ? '表现优秀，继续保持！' : avgAttention >= 0.6 ? '有提升空间，注意关键知识点。' : '需要专注课堂核心环节。'}
      </div>

      <StudentTimeline student={student} currentTime={currentTime} />

      {/* 涉及的知识点 */}
      <div className="win-fieldset">
        <legend>本节课知识点 ({wikiNodes.length})</legend>
        <div className="win-sunken bg-white p-2 max-h-[200px] overflow-auto">
          {wikiNodes.map((n) => {
            // 简单掌握度估算：标题长度 mod 5
            const mastery = ((n.title.length * 7) % 41) / 40; // 0-1
            return (
              <div key={n.id} className="flex items-center gap-2 py-1" style={{ fontSize: '11px' }}>
                <span>📖</span>
                <div className="flex-1">
                  <div className="win-text-bold">{n.title}</div>
                  <div className="text-gray-600">{n.category}</div>
                </div>
                {/* 掌握度条 */}
                <div className="win-sunken" style={{ width: '60px', height: '10px', padding: '1px' }}>
                  <div style={{ width: `${mastery * 100}%`, height: '100%', background: mastery >= 0.6 ? '#008000' : mastery >= 0.3 ? '#808000' : '#ff0000' }} />
                </div>
                <span style={{ fontSize: '10px', color: mastery >= 0.6 ? '#008000' : mastery >= 0.3 ? '#808000' : '#ff0000' }}>
                  {(mastery * 100).toFixed(0)}%
                </span>
                {onOpenWiki && (
                  <button className="win-button" style={{ padding: '0 4px', fontSize: '10px', minWidth: '40px' }} onClick={() => onOpenWiki(n.id)}>
                    学习
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="win-sunken p-2" style={{ background: '#e0f0ff', fontSize: '11px', lineHeight: '1.5' }}>
        <div className="win-text-bold mb-1" style={{ color: '#000080' }}>📚 个性化学习建议</div>
        基于你的本节课表现，AI 助手建议：{avgAttention >= 0.8 ? '继续浏览知识 WIKI 进行深度拓展，尝试解答配套习题。' : '重点回顾低掌握度知识点，必要时通过 AI 助手答疑。'}
        <div className="mt-1 flex gap-2">
          <button className="win-button" style={{ fontSize: '10px', padding: '1px 6px' }} onClick={() => onSeek(0)}>从头回顾</button>
          <button className="win-button" style={{ fontSize: '10px', padding: '1px 6px' }} onClick={() => onOpenWiki?.(wikiNodes[0]?.id)}>打开知识 WIKI</button>
        </div>
      </div>
    </div>
  );
}
