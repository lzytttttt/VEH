import { create } from 'zustand';
import { appsForRole } from '../apps/registry';
import { listNotes, listSessions } from '../data/localStorage';
import type { SessionRecord } from '../data/types';
import { useGameStore } from './gameStore';
import { useGovernanceStore } from './governanceStore';
import type { PortalContext, RoleSummary, SummaryCard, UserRole } from '../harness/types';

/** 5 维综合分（简单平均，与 governanceStore 对齐） */
const avgScore = (m: SessionRecord['metrics']): number =>
  (m.teaching + m.engagement + m.interaction + m.compliance + m.innovation) / 5;

const mean = (arr: number[]): number => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

// —— 角色级数据摘要（Layer2 聚合投影，UI 侧构建，喂给 Provider） ——

function buildAdminSummary(): RoleSummary {
  const ov = useGovernanceStore.getState().getSchoolOverview();
  const cards: SummaryCard[] = [
    { label: '综合评分', value: `${(ov.totalScore * 100).toFixed(1)}%`, trend: ov.scoreChange, refAppId: 'dashboard' },
    { label: '分析覆盖率', value: `${(ov.coverageRate * 100).toFixed(0)}%`, hint: `${ov.analyzedSessions}/${ov.totalSessions} 节`, refAppId: 'dashboard' },
    { label: '活跃教师', value: `${ov.activeTeachers} 名`, refAppId: 'dashboard' },
    { label: '活跃班级', value: `${ov.activeClasses} 个`, refAppId: 'dashboard' },
  ];
  const highlights = [
    `全校综合评分 ${(ov.totalScore * 100).toFixed(1)}%，覆盖率 ${(ov.coverageRate * 100).toFixed(0)}%，活跃教师 ${ov.activeTeachers} 名。`,
  ];
  return { cards, highlights };
}

function buildTeacherSummary(): RoleSummary {
  const mine = listSessions().filter((s) => s.teacherId === 't1');
  const teaching = mean(mine.map((s) => s.metrics.teaching));
  const engagement = mean(mine.map((s) => s.metrics.engagement));
  const overall = mean(mine.map((s) => avgScore(s.metrics)));
  const cards: SummaryCard[] = [
    { label: '已分析课堂', value: `${mine.length} 节`, refAppId: 'report' },
    { label: '平均教学质量', value: `${(teaching * 100).toFixed(0)}%`, refAppId: 'profile' },
    { label: '平均参与度', value: `${(engagement * 100).toFixed(0)}%`, refAppId: 'profile' },
    { label: '综合均分', value: `${(overall * 100).toFixed(1)}%`, refAppId: 'profile' },
  ];
  const highlights = [
    `您已分析 ${mine.length} 节课堂，平均教学质量 ${(teaching * 100).toFixed(0)}%，建议持续教研反思与画像复盘。`,
  ];
  return { cards, highlights };
}

function buildStudentSummary(): RoleSummary {
  const sessions = listSessions();
  const engagement = mean(sessions.map((s) => s.metrics.engagement));
  const best = useGameStore.getState().best;
  const bestTotal = Object.values(best).reduce((a, b) => a + b, 0);
  const bestMax = Object.values(best).reduce((a, b) => Math.max(a, b), 0);
  const notes = listNotes().length;
  const cards: SummaryCard[] = [
    { label: '已回顾课堂', value: `${sessions.length} 节`, refAppId: 'classroom' },
    { label: '平均参与度', value: `${(engagement * 100).toFixed(0)}%`, refAppId: 'report' },
    { label: '闯关最佳得分', value: `${bestTotal} 分`, hint: bestMax > 0 ? `单局最高 ${bestMax}` : '尚未闯关', refAppId: 'learning-game' },
    { label: '我的笔记', value: `${notes} 条`, refAppId: 'notes' },
  ];
  const highlights = [
    `您已回顾 ${sessions.length} 节课堂，闯关累计最佳 ${bestTotal} 分，继续保持互动复习！`,
  ];
  return { cards, highlights };
}

function buildContext(role: UserRole): PortalContext {
  const summary =
    role === 'admin'
      ? buildAdminSummary()
      : role === 'teacher'
        ? buildTeacherSummary()
        : buildStudentSummary();
  // 排除门户自身，避免 Agent 导航回门户形成自引用
  const apps = appsForRole(role)
    .filter((a) => a.id !== 'portal')
    .map((a) => ({ id: a.id, name: a.name, icon: a.icon, category: a.category, description: a.description }));
  return { role, apps, summary };
}

interface PortalState {
  buildPortalContext(role: UserRole): PortalContext;
}

export const usePortalStore = create<PortalState>(() => ({
  buildPortalContext: buildContext,
}));

/** 非 React 上下文下的便捷访问 */
export const portalStore = usePortalStore.getState;
