import { useCallback, useEffect, useRef, useState } from 'react';
import { getProvider } from '../../harness/providerRegistry';
import { getScript } from '../../harness/MockVLMProvider';
import type { AnalysisChunk, AnalysisMode, ScenarioType, UserRole } from '../../harness/types';
import { useSessionStore } from '../../stores/sessionStore';
import { useProfileStore } from '../../stores/profileStore';
import VideoPlaceholder from '../../components/VideoPlaceholder';
import TypingStream from '../../components/TypingStream';
import Timeline from '../../components/Timeline';
import StudentPanel from './StudentPanel';
import MyViewPanel from './MyViewPanel';

export interface ScenarioConfig {
  scenario: ScenarioType;
  icon: string;
}

interface Props {
  config: ScenarioConfig;
  role: UserRole;
  studentId?: string;
  onOpenWiki?: (nodeId: string) => void;
}

export default function ScenarioApp({ config, role, studentId, onOpenWiki }: Props) {
  const script = getScript(config.scenario);
  const [mode, setMode] = useState<AnalysisMode>('realtime');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [chunks, setChunks] = useState<AnalysisChunk[]>([]);
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const chunkQueueRef = useRef<AnalysisChunk[]>([]);
  const rafRef = useRef<number | null>(null);
  const recordSession = useSessionStore((s) => s.recordSession);
  const refreshProfile = useProfileStore((s) => s.refresh);

  // 当前帧
  const currentFrame = script.frames
    .filter((f) => f.t <= currentTime)
    .pop() ?? null;

  // 流式 flush
  const flush = useCallback(() => {
    rafRef.current = null;
    const q = chunkQueueRef.current;
    if (q.length === 0) return;
    chunkQueueRef.current = [];
    setChunks((prev) => {
      const next = [...prev, ...q];
      return next.length > 300 ? next.slice(next.length - 300) : next;
    });
  }, []);

  const enqueue = useCallback((c: AnalysisChunk) => {
    chunkQueueRef.current.push(c);
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flush);
    }
  }, [flush]);

  // 启动 / 停止分析流
  const startStream = useCallback(async () => {
    abortRef.current = { cancelled: false };
    const token = abortRef.current;
    const provider = getProvider();
    try {
      for await (const chunk of provider.analyzeStream({
        scenario: config.scenario,
        mode,
        role,
        studentId,
        frames: script.frames,
        transcript: script.transcript,
        startFrom: currentTime,
        speed,
      })) {
        if (token.cancelled) break;
        enqueue(chunk);
        setCurrentTime(chunk.timestamp);
      }
      // 分析完成后落库（端到端联调链路）
      if (!token.cancelled) {
        recordSession(config.scenario);
        refreshProfile();
      }
    } catch (e) {
      console.error('Stream error', e);
    }
  }, [config.scenario, mode, role, studentId, currentTime, speed, script.frames, script.transcript, enqueue]);

  // 播放/暂停控制
  useEffect(() => {
    if (!playing) {
      abortRef.current.cancelled = true;
      return;
    }
    startStream();
    return () => {
      abortRef.current.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode, speed]);

  // 卸载清理
  useEffect(() => {
    return () => {
      abortRef.current.cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleSeek = (t: number) => {
    abortRef.current.cancelled = true;
    setPlaying(false);
    setCurrentTime(t);
    // 重新切片 chunks（回放显示）
    const visible = script.analysisScript.filter((c) => c.timestamp <= t);
    setChunks(visible);
  };

  const handleModeChange = (m: AnalysisMode) => {
    abortRef.current.cancelled = true;
    setPlaying(false);
    setMode(m);
    if (m === 'playback') {
      // 回放模式：直接显示当前时间之前的所有 chunks
      const visible = script.analysisScript.filter((c) => c.timestamp <= currentTime);
      setChunks(visible);
    } else {
      // 实时模式：清空已显示，从 currentTime 继续
      setChunks(script.analysisScript.filter((c) => c.timestamp <= currentTime));
    }
  };

  // 当前可见的 chunks（回放模式直接显示全部 <= currentTime；实时模式只显示已 yield 的）
  const visibleChunks = mode === 'playback'
    ? script.analysisScript.filter((c) => c.timestamp <= currentTime)
    : chunks;

  const currentStudentId = role === 'student' ? (studentId ?? script.students[0]?.id) : undefined;
  const myStudent = script.students.find((s) => s.id === currentStudentId) ?? null;

  return (
    <div className="flex flex-col h-full bg-win-gray">
      {/* 菜单栏 */}
      <div className="flex items-center gap-3 px-2 py-1" style={{ fontSize: '11px', background: '#c0c0c0', borderBottom: '1px solid #808080' }}>
        <span className="win-text-bold">{script.title}</span>
        <span className="text-gray-600">|</span>
        <span>模式:</span>
        <button className={`win-button ${mode === 'realtime' ? 'is-pressed' : ''}`} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => handleModeChange('realtime')}>
          实时
        </button>
        <button className={`win-button ${mode === 'playback' ? 'is-pressed' : ''}`} style={{ padding: '1px 6px', fontSize: '10px' }} onClick={() => handleModeChange('playback')}>
          回放
        </button>
        <span className="text-gray-600">|</span>
        <span className="win-text-disabled">{mode === 'realtime' ? 'VLM 实时分析中' : '基于已存数据分析'}</span>
        <div className="flex-1" />
        <span className="win-text-disabled">Provider: MockVLMProvider</span>
      </div>

      {/* 主内容三栏 */}
      <div className="flex-1 flex gap-1 p-1 overflow-hidden">
        {/* 左：虚拟画面 */}
        <div style={{ width: '44%' }} className="flex flex-col gap-1">
          <VideoPlaceholder
            currentFrame={currentFrame}
            recording={playing}
            scenarioTitle={script.title}
            scenarioIcon={config.icon}
            duration={script.duration}
            currentTime={currentTime}
          />
          {/* 转录 */}
          <div className="win-sunken p-2 bg-white overflow-auto" style={{ height: '120px', fontSize: '11px' }}>
            <div className="win-text-bold mb-1" style={{ fontSize: '10px' }}>🔊 转录（{script.transcript.filter(t => t.t <= currentTime).length}/{script.transcript.length}）</div>
            {script.transcript.filter(t => t.t <= currentTime).map((t, i) => (
              <div key={i} className="py-[2px]">
                <span className="text-gray-500">[{Math.floor(t.t / 60)}:{(t.t % 60).toString().padStart(2, '0')}]</span>{' '}
                <span className={t.speaker === 'teacher' ? 'win-text-bold' : ''}>{t.speaker === 'teacher' ? '教师' : t.speaker === 'student' ? '学生' : '系统'}:</span>{' '}
                {t.text}
              </div>
            ))}
          </div>
        </div>

        {/* 中：分析流 */}
        <div style={{ width: '32%' }} className="flex flex-col gap-1">
          <div className="px-1 py-[2px]" style={{ fontSize: '10px', color: '#808080' }}>
            ▌ VLM 分析输出（{visibleChunks.length} events）
          </div>
          <div className="flex-1 min-h-0">
            <TypingStream chunks={visibleChunks} />
          </div>
        </div>

        {/* 右：学生面板（教师视角）/ 我的视角（学生视角） */}
        <div style={{ width: '24%' }} className="flex flex-col min-h-0">
          {role === 'teacher' ? (
            <StudentPanel
              students={script.students}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          ) : (
            <MyViewPanel
              student={myStudent}
              wikiNodes={script.wiki.nodes}
              currentTime={currentTime}
              onSeek={handleSeek}
              onOpenWiki={onOpenWiki}
            />
          )}
        </div>
      </div>

      {/* 底部时间线 */}
      <div className="p-1">
        <Timeline
          duration={script.duration}
          currentTime={currentTime}
          chunks={script.analysisScript}
          onSeek={handleSeek}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          speed={speed}
          onSpeedChange={(s) => {
            setSpeed(s);
            if (playing) {
              // 重启以应用新倍速
              abortRef.current.cancelled = true;
              setTimeout(() => startStream(), 0);
            }
          }}
        />
      </div>
    </div>
  );
}
