import { useMemo } from 'react';

interface FrameSample {
  t: number;
  snapshot: string;
  metrics?: Record<string, number>;
}

interface Props {
  /** 当前帧索引 */
  currentFrame: FrameSample | null;
  /** 是否录制中 */
  recording: boolean;
  /** 场景标题 */
  scenarioTitle: string;
  /** 场景图标 */
  scenarioIcon: string;
  /** 总时长 */
  duration: number;
  /** 当前时间 t */
  currentTime: number;
}

/**
 * 虚拟画面区域 — 用 CSS/SVG 模拟摄像头取景
 * 在没有真实视频流时，由剧本 snapshot 文字驱动画面渲染
 */
export default function VideoPlaceholder({
  currentFrame,
  recording,
  scenarioTitle,
  scenarioIcon,
  duration,
  currentTime,
}: Props) {
  // 根据场景图标 + 帧描述渲染虚拟画面
  const sceneGradient = useMemo(() => {
    const seed = (scenarioTitle.charCodeAt(0) || 0) % 5;
    const palettes = [
      'linear-gradient(135deg, #2d3a4a 0%, #4a5a6a 50%, #1a2530 100%)',
      'linear-gradient(135deg, #3d4a2a 0%, #5a6a3a 50%, #25351a 100%)',
      'linear-gradient(135deg, #4a2a3a 0%, #6a3a4a 50%, #301a25 100%)',
      'linear-gradient(135deg, #2a3a4a 0%, #3a5a6a 50%, #1a2530 100%)',
      'linear-gradient(135deg, #4a4a2a 0%, #6a6a3a 50%, #30301a 100%)',
    ];
    return palettes[seed];
  }, [scenarioTitle]);

  return (
    <div className="win-sunken h-full flex flex-col" style={{ background: '#000' }}>
      {/* 画面区 */}
      <div className="relative flex-1 overflow-hidden" style={{ background: sceneGradient }}>
        {/* 网格纹理模拟教室/实验室空间感 */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'perspective(800px) rotateX(60deg) translateY(20%)',
          }}
        />
        {/* 大图标 + 当前帧描述 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <div style={{ fontSize: '64px', filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.8))' }}>{scenarioIcon}</div>
          <div className="mt-2 text-white text-center" style={{ fontSize: '13px', textShadow: '0 0 6px #000' }}>
            {currentFrame ? currentFrame.snapshot : '准备就绪'}
          </div>
          {/* 帧指标 */}
          {currentFrame?.metrics && (
            <div className="mt-3 flex gap-2 flex-wrap justify-center">
              {Object.entries(currentFrame.metrics).map(([k, v]) => (
                <div
                  key={k}
                  className="px-2 py-1"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#00ff80', fontSize: '10px', border: '1px solid #008080' }}
                >
                  {k}: {typeof v === 'number' ? v.toFixed(2) : v}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* 顶部叠加信息：场景标题 */}
        <div className="absolute top-2 left-2 px-2 py-1" style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '11px' }}>
          📷 {scenarioTitle}
        </div>
        {/* 录制指示器 */}
        {recording && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className="animate-blink" style={{ color: '#ff0000', fontSize: '14px' }}>●</span>
            <span style={{ color: '#ff0000', fontSize: '11px', fontWeight: 'bold' }}>REC</span>
          </div>
        )}
        {/* 扫描线动画 */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,128,0.05) 50%, transparent 100%)',
            animation: 'scan-line 4s linear infinite',
          }}
        />
      </div>

      {/* 时间码 */}
      <div className="flex items-center justify-between px-2 py-1" style={{ background: '#000', color: '#00ff80', fontSize: '11px', fontFamily: 'var(--win-font-mono)' }}>
        <span>{formatTimecode(currentTime)} / {formatTimecode(duration)}</span>
        <span>{recording ? '● LIVE' : '■ STOP'}</span>
      </div>
    </div>
  );
}

function formatTimecode(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
