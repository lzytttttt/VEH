import { useEffect, useMemo, useState } from 'react';
import { getGovernanceProvider } from '../harness/providerRegistry';
import { useIsMobile } from '../lib/useIsMobile';
import { useGovernanceStore } from '../stores/governanceStore';
import type { AnomalyAlert, GovernanceContext, ResearchSuggestion } from '../harness/types';

/** 系统集成 Mock 数据 */
const INTEGRATIONS = [
  { id: 'card', name: '一卡通系统', icon: '💳', status: 'connected', lastSync: '2025-12-04 08:30', records: 1280 },
  { id: 'academic', name: '教务系统', icon: '📋', status: 'connected', lastSync: '2025-12-04 07:15', records: 86 },
  { id: 'dingtalk', name: '钉钉', icon: '💬', status: 'syncing', lastSync: '2025-12-04 09:00', records: 240 },
  { id: 'wecom', name: '企业微信', icon: '🏢', status: 'disconnected', lastSync: '2025-11-28 16:00', records: 0 },
];

const SYNC_LOGS = [
  { time: '09:00:12', source: '钉钉', msg: '同步教师通讯录 240 条', ok: true },
  { time: '08:30:05', source: '一卡通', msg: '同步学生考勤 1280 条', ok: true },
  { time: '07:15:33', source: '教务系统', msg: '同步课程表 86 节', ok: true },
  { time: '07:14:58', source: '教务系统', msg: '同步班级花名册 5 个', ok: true },
  { time: '06:00:00', source: '企业微信', msg: '连接超时，自动重试中...', ok: false },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  connected: { label: '已连接', color: '#008000', bg: '#e0ffe0' },
  syncing: { label: '同步中', color: '#808000', bg: '#ffffe0' },
  disconnected: { label: '未连接', color: '#FF0000', bg: '#ffe0e0' },
};

type Tab = 'teachers' | 'classes' | 'integration' | 'sso';

/**
 * 教务管理台 — Tab 切换 + Agent 教务洞察(detectAnomalies + suggestResearch)
 */
export default function AdminConsoleApp() {
  const buildCtx = useGovernanceStore((s) => s.buildGovernanceContext);
  const ctx: GovernanceContext = useMemo(() => buildCtx(), [buildCtx]);
  const teachers = ctx.aggregates.teacherComparison;
  const classes = ctx.aggregates.classComparison;

  const [tab, setTab] = useState<Tab>('teachers');
  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ResearchSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // 加载异常预警
  useEffect(() => {
    getGovernanceProvider()
      .detectAnomalies(ctx)
      .then(setAlerts)
      .catch((e) => console.error('detectAnomalies failed', e));
  }, [ctx]);

  // 选中教师时加载教研建议
  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherId(id);
    setSuggestion(null);
    setLoadingSuggestion(true);
    getGovernanceProvider()
      .suggestResearch({ type: 'teacher', id }, ctx)
      .then(setSuggestion)
      .catch((e) => console.error('suggestResearch failed', e))
      .finally(() => setLoadingSuggestion(false));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'teachers', label: '教师管理' },
    { id: 'classes', label: '班级管理' },
    { id: 'integration', label: '系统集成' },
    { id: 'sso', label: 'SSO配置' },
  ];

  return (
    <div className="flex flex-col p-2 gap-2" style={{ fontSize: '11px', height: '100%' }}>
      {/* Tab 栏 —— 移动端横滑 + 触控放大 */}
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className="win-button shrink-0"
            style={{
              fontSize: '12px',
              padding: isMobile ? '6px 14px' : '3px 12px',
              minHeight: isMobile ? '36px' : undefined,
              background: tab === t.id ? '#000080' : undefined,
              color: tab === t.id ? '#fff' : undefined,
              fontWeight: tab === t.id ? 'bold' : undefined,
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="win-sunken bg-white p-2 flex-1 overflow-auto" style={{ minHeight: '0' }}>
        {tab === 'teachers' && (
          isMobile ? (
            <div className="flex flex-col gap-2">
              {teachers.map((t) => (
                <div key={t.teacherId} className="win-raised p-2" style={{ background: selectedTeacherId === t.teacherId ? '#ffffe0' : '#c0c0c0' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="win-text-bold" style={{ fontSize: '13px' }}>{t.teacherName}</span>
                    <span style={{ fontSize: '10px', color: '#808080' }}>{t.subject} · {ctx.raw.teachers.find((x) => x.id === t.teacherId)?.department ?? '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '11px' }}>
                      综合 <span style={{ color: t.avgScore >= 0.85 ? '#008000' : t.avgScore >= 0.75 ? '#808000' : '#FF0000', fontWeight: 'bold' }}>{(t.avgScore * 100).toFixed(1)}%</span>
                      {' · '}授课 {t.sessionCount}
                    </span>
                    <button className="win-button" style={{ fontSize: '11px', padding: '4px 10px', minHeight: '32px' }} onClick={() => handleSelectTeacher(t.teacherId)}>
                      🤖 AI教研建议
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <table className="w-full" style={{ fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#c0c0c0' }}>
                <th className="p-1 text-left" style={{ border: '1px solid #808080' }}>姓名</th>
                <th className="p-1 text-left" style={{ border: '1px solid #808080' }}>学科</th>
                <th className="p-1 text-left" style={{ border: '1px solid #808080' }}>教研组</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>综合分</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>授课数</th>
                <th className="p-1 text-center" style={{ border: '1px solid #808080' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.teacherId} style={{ background: selectedTeacherId === t.teacherId ? '#ffffe0' : undefined }}>
                  <td className="p-1" style={{ border: '1px solid #c0c0c0' }}>{t.teacherName}</td>
                  <td className="p-1" style={{ border: '1px solid #c0c0c0' }}>{t.subject}</td>
                  <td className="p-1" style={{ border: '1px solid #c0c0c0' }}>{ctx.raw.teachers.find((x) => x.id === t.teacherId)?.department ?? '-'}</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0', color: t.avgScore >= 0.85 ? '#008000' : t.avgScore >= 0.75 ? '#808000' : '#FF0000', fontWeight: 'bold' }}>{(t.avgScore * 100).toFixed(1)}%</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0' }}>{t.sessionCount}</td>
                  <td className="p-1 text-center" style={{ border: '1px solid #c0c0c0' }}>
                    <button className="win-button" style={{ fontSize: '10px', padding: '1px 6px' }} onClick={() => handleSelectTeacher(t.teacherId)}>
                      AI教研建议
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )
        )}

        {tab === 'classes' && (
          isMobile ? (
            <div className="flex flex-col gap-2">
              {[...classes].sort((a, b) => b.avgScore - a.avgScore).map((c) => (
                <div key={c.classId} className="win-raised p-2" style={{ background: '#c0c0c0' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="win-text-bold" style={{ fontSize: '13px' }}>{c.className}</span>
                    <span style={{ fontSize: '11px' }}>
                      班均 <span style={{ color: c.avgScore >= 0.85 ? '#008000' : c.avgScore >= 0.75 ? '#808000' : '#FF0000', fontWeight: 'bold' }}>{(c.avgScore * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: '11px', color: '#808080' }}>
                    <span>学生 {c.studentCount} · 授课 {c.sessionCount}</span>
                    <span style={{ color: c.trend >= 0 ? '#008000' : '#FF0000' }}>{c.trend >= 0 ? '↑' : '↓'} {c.trend >= 0 ? '+' : ''}{(c.trend * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <table className="w-full" style={{ fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#c0c0c0' }}>
                <th className="p-1 text-left" style={{ border: '1px solid #808080' }}>班级</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>班均分</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>学生数</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>授课数</th>
                <th className="p-1 text-right" style={{ border: '1px solid #808080' }}>环比</th>
              </tr>
            </thead>
            <tbody>
              {[...classes].sort((a, b) => b.avgScore - a.avgScore).map((c) => (
                <tr key={c.classId}>
                  <td className="p-1" style={{ border: '1px solid #c0c0c0' }}>{c.className}</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0', color: c.avgScore >= 0.85 ? '#008000' : c.avgScore >= 0.75 ? '#808000' : '#FF0000', fontWeight: 'bold' }}>{(c.avgScore * 100).toFixed(1)}%</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0' }}>{c.studentCount}</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0' }}>{c.sessionCount}</td>
                  <td className="p-1 text-right" style={{ border: '1px solid #c0c0c0', color: c.trend >= 0 ? '#008000' : '#FF0000' }}>{c.trend >= 0 ? '+' : ''}{(c.trend * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          )
        )}

        {tab === 'integration' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {INTEGRATIONS.map((it) => {
                const meta = STATUS_META[it.status];
                return (
                  <div key={it.id} className="win-raised" style={{ padding: '8px', minWidth: isMobile ? '0' : '180px', flex: isMobile ? '1 1 calc(50% - 4px)' : undefined }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '18px' }}>{it.icon}</span>
                      <span className="win-text win-text-bold">{it.name}</span>
                    </div>
                    <div className="mt-1 px-1 inline-block" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}`, fontSize: '10px' }}>
                      {meta.label}
                    </div>
                    <div className="win-text mt-1" style={{ fontSize: '10px', color: '#808080' }}>最近同步: {it.lastSync}</div>
                    <div className="win-text" style={{ fontSize: '10px', color: '#808080' }}>同步记录: {it.records} 条</div>
                  </div>
                );
              })}
            </div>
            <div className="win-fieldset">
              <legend>同步日志</legend>
              <div style={{ fontSize: '10px', fontFamily: 'var(--win-font-mono)' }}>
                {SYNC_LOGS.map((log, i) => (
                  <div key={i} className="flex gap-2 py-[2px]">
                    <span style={{ color: '#808080' }}>[{log.time}]</span>
                    <span style={{ color: '#000080', minWidth: '60px' }}>{log.source}</span>
                    <span style={{ color: log.ok ? '#008000' : '#FF0000' }}>{log.ok ? '✓' : '✗'}</span>
                    <span>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'sso' && (
          <div className="flex flex-col gap-3" style={{ fontSize: '11px' }}>
            <div className="win-fieldset">
              <legend>认证方式</legend>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2"><input type="radio" name="auth" defaultChecked /> CAS 统一身份认证（已启用）</label>
                <label className="flex items-center gap-2"><input type="radio" name="auth" /> LDAP 目录认证</label>
                <label className="flex items-center gap-2"><input type="radio" name="auth" /> OAuth 2.0</label>
                <label className="flex items-center gap-2"><input type="radio" name="auth" /> 账号密码（本地）</label>
              </div>
            </div>
            <div className="win-fieldset">
              <legend>数据源管理</legend>
              <div className="win-text">
                · 教务系统 API: <span style={{ color: '#008000' }}>●已对接</span> — 自动同步课表/班级/教师<br />
                · 一卡通接口: <span style={{ color: '#008000' }}>●已对接</span> — 自动同步学生考勤<br />
                · 录播系统: <span style={{ color: '#808000' }}>●部分对接</span> — 课堂视频流待接入<br />
                · 成绩系统: <span style={{ color: '#FF0000' }}>○未对接</span> — 需配置 API Key
              </div>
            </div>
            <div className="win-fieldset">
              <legend>SSO 配置参数（演示）</legend>
              <div className="win-text" style={{ fontFamily: 'var(--win-font-mono)', fontSize: '10px' }}>
                CAS Server: https://sso.school.edu.cn/cas<br />
                LDAP Host: ldap://10.0.1.20:389<br />
                Role Mapping: 教师→teacher · 管理员→admin · 学生→student<br />
                Token TTL: 7200s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部 Agent 教务洞察区 */}
      <div className="win-fieldset" style={{ maxHeight: '160px', flexShrink: 0 }}>
        <legend>🤖 Agent 教务洞察（预警 {alerts.length} 条{selectedTeacherId ? ` · 教研建议: ${ctx.raw.teachers.find(t => t.id === selectedTeacherId)?.name}` : ''}）</legend>
        <div className="flex gap-2 overflow-auto" style={{ maxHeight: '120px' }}>
          {selectedTeacherId && (
            <div className="win-sunken bg-white p-2" style={{ minWidth: '220px', flexShrink: 0 }}>
              <div className="win-text-bold" style={{ color: '#000080', marginBottom: '4px' }}>📋 AI 教研建议</div>
              {loadingSuggestion && <div className="animate-blink">▌ 分析中...</div>}
              {suggestion && (
                <div style={{ fontSize: '10px', lineHeight: '1.5' }}>
                  <div>目标: {suggestion.target.name}</div>
                  <div>短板: {suggestion.dimension}（{(suggestion.currentScore * 100).toFixed(1)}%）</div>
                  <div>优先级: <span style={{ color: suggestion.priority === 'high' ? '#FF0000' : suggestion.priority === 'medium' ? '#808000' : '#008000' }}>{suggestion.priority}</span></div>
                  <div className="mt-1">{suggestion.suggestion}</div>
                </div>
              )}
            </div>
          )}
          {alerts.length === 0 && !selectedTeacherId && <div className="win-text p-2">✓ 当前未检测到异常预警</div>}
          {alerts.map((a) => (
            <div key={a.id} className="px-2 py-1" style={{ background: a.severity === 'critical' ? '#ffe0e0' : '#ffffe0', border: `1px solid ${a.severity === 'critical' ? '#FF0000' : '#808000'}`, minWidth: '200px', flexShrink: 0, fontSize: '10px' }}>
              <div className="flex items-center gap-1">
                <span>{a.severity === 'critical' ? '🔴' : '🟡'}</span>
                <span className="win-text-bold">{a.target.name}</span>
              </div>
              <div className="mt-1">{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
