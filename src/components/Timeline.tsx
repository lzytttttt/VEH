import type { AnalysisChunk } from '../harness/types';

interface Props {
  duration: number;
  currentTime: number;
  chunks: AnalysisChunk[];
  onSeek: (t: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (s: number) => void;
}

const EVENT_COLORS: Record<string, string> = {
  session_start: '#008000',
  session_end: '#800000',
  board_writing: '#000080',
  demo_start: '#1084d0',
  qa_high_quality: '#808000',
  group_work: '#800080',
  summary: '#008080',
  correction: '#ff0000',
  practice: '#008000',
  competition: '#800080',
  calculation: '#000080',
  default: '#808080',
};

export default function Timeline({
  duration,
  currentTime,
  chunks,
  onSeek,
  playing,
  onTogglePlay,
  speed,
  onSpeedChange,
}: Props) {
  // 只显示 event 类型
  const events = chunks.filter((c) => c.type === 'event' || c.type === 'frame_ref');

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, ratio * duration)));
  };

  return (
    <div className="win-raised p-2 flex flex-col gap-2">
      {/* 时间轴主体 */}
      <div
        className="win-sunken relative h-12 cursor-pointer"
        style={{ background: '#fff' }}
        onClick={handleClick}
      >
        {/* 刻度 */}
        {Array.from({ length: Math.ceil(duration / 30) + 1 }).map((_, i) => {
          const t = i * 30;
          const left = (t / duration) * 100;
          return (
            <div key={i} className="absolute top-0 bottom-0" style={{ left: `${left}%`, borderLeft: '1px solid #c0c0c0' }}>
              <span className="absolute top-[2px] left-[2px]" style={{ fontSize: '9px', color: '#808080' }}>
                {Math.floor(t / 60)}:{(t % 60).toString().padStart(2, '0')}
              </span>
            </div>
          );
        })}
        {/* 事件标记 */}
        {events.map((ev, i) => {
          const left = (ev.timestamp / duration) * 100;
          const color = ev.type === 'frame_ref' ? '#c0c0c0' : EVENT_COLORS[ev.label || ''] || EVENT_COLORS.default;
          return (
            <div
              key={i}
              className="absolute bottom-0"
              style={{ left: `${left}%`, width: '3px', height: '12px', background: color }}
              title={`${ev.label || ''} @ ${ev.timestamp}s`}
            />
          );
        })}
        {/* 播放头 */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${(currentTime / duration) * 100}%`,
            width: '2px',
            background: '#ff0000',
            boxShadow: '0 0 4px #ff0000',
          }}
        >
          <div
            className="absolute -top-1 -left-[6px] w-0 h-0"
            style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #ff0000' }}
          />
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center gap-2">
        <button className="win-button" style={{ minWidth: '40px', padding: '2px 8px' }} onClick={onTogglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="win-button" style={{ minWidth: '40px', padding: '2px 8px' }} onClick={() => onSeek(0)}>
          ⏮
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '11px' }}>倍速:</span>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              className={`win-button ${speed === s ? 'is-pressed' : ''}`}
              style={{ minWidth: '36px', padding: '2px 6px', fontSize: '11px' }}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
