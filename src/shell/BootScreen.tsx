import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const BOOT_LINES = [
  'VLM Edu Hub BIOS v1.95',
  'Copyright (C) 1995-2026 VLM Edu Hub Inc.',
  '',
  'CPU: Qwen-VLM 3.6-27B (INT4 quantization) @ 1.2 TFLOPS',
  'Memory Test: 640K Base, 65536K Extended ... OK',
  '',
  'Detecting Multimodal Devices:',
  '  Primary Camera ........... [READY]',
  '  Audio Capture ............ [READY]',
  '  Slide Capture ............ [READY]',
  '  LLM Engine (Qwen-VLM) .... [READY]',
  '  Harness Orchestrator ..... [READY]',
  '',
  'Loading Provider Adapters:',
  '  [MockAdapter]  loaded',
  '  [OpenAIAdapter] skeleton',
  '  [QwenAdapter]   skeleton',
  '  [VLLMAdapter]   skeleton',
  '',
  'Initializing scenario registry: 5 scenes loaded',
  '',
  'Booting Windows 95 Nostalgia OS ...',
];

export default function BootScreen() {
  const setStage = useAuthStore((s) => s.setStage);
  const setBootProgress = useAuthStore((s) => s.setBootProgress);
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'bios' | 'logo' | 'fade'>('bios');

  // BIOS 文本逐行打印
  useEffect(() => {
    if (visibleLines >= BOOT_LINES.length) {
      const t = setTimeout(() => setPhase('logo'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 120);
    return () => clearTimeout(t);
  }, [visibleLines]);

  // Logo 阶段进度条
  useEffect(() => {
    if (phase !== 'logo') return;
    if (progress >= 100) {
      const t = setTimeout(() => setPhase('fade'), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setProgress((p) => Math.min(100, p + 6));
      setBootProgress(Math.min(100, progress + 6));
    }, 80);
    return () => clearTimeout(t);
  }, [phase, progress, setBootProgress]);

  // 过渡到登录
  useEffect(() => {
    if (phase !== 'fade') return;
    const t = setTimeout(() => setStage('login'), 800);
    return () => clearTimeout(t);
  }, [phase, setStage]);

  return (
    <div
      className={`fixed inset-0 bg-black text-white font-mono ${
        phase === 'fade' ? 'animate-fade-in opacity-100' : 'opacity-100'
      }`}
      style={{ fontSize: 'clamp(11px, 3.5vw, 14px)', lineHeight: '1.5' }}
    >
      {phase === 'bios' && (
        <div className="p-6 whitespace-pre-wrap">
          {BOOT_LINES.slice(0, visibleLines).join('\n')}
          {visibleLines < BOOT_LINES.length && <span className="animate-blink">_</span>}
        </div>
      )}

      {phase === 'logo' && (
        <div className="absolute inset-0 flex flex-col">
          {/* 天空 LOGO 区 */}
          <div className="win-boot-sky relative flex-1 overflow-hidden flex flex-col items-center justify-center">
            {/* 云朵 */}
            <div className="win-boot-cloud" style={{ width: '260px', height: '70px', top: '12%', left: '8%' }} />
            <div className="win-boot-cloud" style={{ width: '180px', height: '52px', top: '22%', right: '12%' }} />
            <div className="win-boot-cloud" style={{ width: '320px', height: '84px', bottom: '16%', left: '18%' }} />
            <div className="win-boot-cloud" style={{ width: '200px', height: '60px', bottom: '26%', right: '20%' }} />

            {/* 标题文字：白字 + 黑色描边（经典开机屏） */}
            <div className="relative flex items-start gap-4" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 3px 3px 6px rgba(0,0,0,0.45)' }}>
              {/* 四色旗帜 */}
              <div
                className="grid grid-cols-2 grid-rows-2 gap-[3px] mt-4"
                style={{ width: '56px', height: '52px', transform: 'skewY(-4deg)' }}
              >
                <div className="bg-[#ff0000]" />
                <div className="bg-[#00c000]" />
                <div className="bg-[#0000ff]" />
                <div className="bg-[#ffff00]" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-white" style={{ fontSize: '15px', letterSpacing: '1px' }}>
                  Microsoft<span style={{ fontSize: '10px', verticalAlign: 'super' }}>®</span>
                </span>
                <span className="text-white" style={{ fontSize: 'clamp(32px, 13vw, 54px)', fontWeight: 300, lineHeight: 1.05 }}>
                  Windows
                  <span style={{ fontWeight: 700, marginLeft: '10px' }}>95</span>
                </span>
              </div>
            </div>

            <div
              className="relative text-white mt-5"
              style={{
                fontSize: '13px',
                letterSpacing: '2px',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}
            >
              VLM Edu Hub Edition · {progress < 100 ? '正在启动…' : '欢迎'}
            </div>
          </div>

          {/* 底部流动加载条 */}
          <div className="win-boot-strip" />
        </div>
      )}

      {phase === 'fade' && (
        <div className="absolute inset-0 bg-black animate-fade-in" />
      )}
    </div>
  );
}
