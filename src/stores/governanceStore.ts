import { create } from 'zustand';
import { getDB, listSessions } from '../data/localStorage';
import { useOrgStore } from './orgStore';
import type { SessionRecord } from '../data/types';
import type {
  ClassComparisonRow,
  GovernanceContext,
  SchoolOverview,
  SessionSummary,
  SubjectComparisonRow,
  TeacherComparisonRow,
  TeacherSummary,
  TrendSeries,
} from '../harness/types';

/** 5 维综合分（简单平均） */
const avgScore = (m: SessionRecord['metrics']): number =>
  (m.teaching + m.engagement + m.interaction + m.compliance + m.innovation) / 5;

const mean = (arr: number[]): number => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/** 获取学期列表（按时间正序） */
function getTermIds(): string[] {
  return getDB().terms.map((t) => t.id);
}

function sessionsByTerm(termId: string): SessionRecord[] {
  return listSessions().filter((s) => s.termId === termId);
}

function getCurrentTermId(): string {
  return useOrgStore.getState().getCurrentTermId();
}

// —— Layer 2 聚合计算（纯函数，不依赖 this） ——

function computeSchoolOverview(): SchoolOverview {
  const termIds = getTermIds();
  const currentTermId = getCurrentTermId();
  const prevTermId = termIds[termIds.indexOf(currentTermId) - 1];
  const cur = sessionsByTerm(currentTermId);
  const prev = prevTermId ? sessionsByTerm(prevTermId) : [];
  const curAvg = mean(cur.map((s) => avgScore(s.metrics)));
  const prevAvg = mean(prev.map((s) => avgScore(s.metrics)));
  const totalSessions = Math.ceil(cur.length / 0.65);
  return {
    totalScore: curAvg,
    scoreChange: cur.length && prev.length ? curAvg - prevAvg : 0,
    analyzedSessions: cur.length,
    totalSessions,
    coverageRate: totalSessions ? cur.length / totalSessions : 0,
    activeTeachers: new Set(cur.map((s) => s.teacherId)).size,
    activeClasses: new Set(cur.map((s) => s.classId)).size,
  };
}

function computeClassComparison(): ClassComparisonRow[] {
  const termIds = getTermIds();
  const currentTermId = getCurrentTermId();
  const prevTermId = termIds[termIds.indexOf(currentTermId) - 1];
  const cur = sessionsByTerm(currentTermId);
  const prev = prevTermId ? sessionsByTerm(prevTermId) : [];
  return getDB().classes
    .map((c) => {
      const curClass = cur.filter((s) => s.classId === c.id);
      const prevClass = prev.filter((s) => s.classId === c.id);
      const curAvg = mean(curClass.map((s) => avgScore(s.metrics)));
      const prevAvg = mean(prevClass.map((s) => avgScore(s.metrics)));
      return {
        classId: c.id,
        className: c.name,
        avgScore: curAvg,
        sessionCount: curClass.length,
        studentCount: c.studentCount,
        trend: curClass.length && prevClass.length ? curAvg - prevAvg : 0,
      };
    })
    .filter((r) => r.sessionCount > 0);
}

function computeSubjectComparison(): SubjectComparisonRow[] {
  const cur = sessionsByTerm(getCurrentTermId());
  return getDB().subjects
    .map((sub) => {
      const subSessions = cur.filter((s) => s.subjectId === sub.id);
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        avgScore: mean(subSessions.map((s) => avgScore(s.metrics))),
        teacherCount: new Set(subSessions.map((s) => s.teacherId)).size,
        sessionCount: subSessions.length,
      };
    })
    .filter((r) => r.sessionCount > 0);
}

function computeTeacherComparison(): TeacherComparisonRow[] {
  const cur = sessionsByTerm(getCurrentTermId());
  return getDB().teacherProfiles
    .map((t) => {
      const tSessions = cur.filter((s) => s.teacherId === t.id);
      const metrics = tSessions.length
        ? {
            teaching: mean(tSessions.map((s) => s.metrics.teaching)),
            engagement: mean(tSessions.map((s) => s.metrics.engagement)),
            interaction: mean(tSessions.map((s) => s.metrics.interaction)),
            compliance: mean(tSessions.map((s) => s.metrics.compliance)),
            innovation: mean(tSessions.map((s) => s.metrics.innovation)),
          }
        : { teaching: 0, engagement: 0, interaction: 0, compliance: 0, innovation: 0 };
      return {
        teacherId: t.id,
        teacherName: t.name,
        subject: t.subject,
        avgScore: mean(tSessions.map((s) => avgScore(s.metrics))),
        sessionCount: tSessions.length,
        metrics,
      };
    })
    .filter((r) => r.sessionCount > 0);
}

function computeTrends(): TrendSeries[] {
  const all = listSessions();
  return getDB().terms
    .map((t) => {
      const tSessions = all.filter((s) => s.termId === t.id);
      return {
        termId: t.id,
        termName: t.name,
        avgScore: mean(tSessions.map((s) => avgScore(s.metrics))),
        sessionCount: tSessions.length,
      };
    })
    .filter((r) => r.sessionCount > 0);
}

function buildContext(): GovernanceContext {
  const allSessions: SessionSummary[] = listSessions().map((s) => ({
    id: s.id,
    scenario: s.scenario,
    title: s.title,
    teacherId: s.teacherId,
    teacherName: s.teacherName,
    date: s.date,
    duration: s.duration,
    metrics: s.metrics,
    studentCount: s.studentCount,
    classId: s.classId,
    gradeId: s.gradeId,
    termId: s.termId,
    subjectId: s.subjectId,
  }));
  const teachers: TeacherSummary[] = getDB().teacherProfiles.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    title: t.title,
    department: t.department,
    sessionCount: listSessions().filter((s) => s.teacherId === t.id).length,
  }));
  return {
    raw: { sessions: allSessions, teachers, org: useOrgStore.getState().getOrgSnapshot() },
    aggregates: {
      schoolOverview: computeSchoolOverview(),
      classComparison: computeClassComparison(),
      subjectComparison: computeSubjectComparison(),
      teacherComparison: computeTeacherComparison(),
      trends: computeTrends(),
    },
  };
}

interface GovernanceState {
  getSchoolOverview(): SchoolOverview;
  getClassComparison(): ClassComparisonRow[];
  getSubjectComparison(): SubjectComparisonRow[];
  getTeacherComparison(): TeacherComparisonRow[];
  getTrends(): TrendSeries[];
  buildGovernanceContext(): GovernanceContext;
}

export const useGovernanceStore = create<GovernanceState>(() => ({
  getSchoolOverview: computeSchoolOverview,
  getClassComparison: computeClassComparison,
  getSubjectComparison: computeSubjectComparison,
  getTeacherComparison: computeTeacherComparison,
  getTrends: computeTrends,
  buildGovernanceContext: buildContext,
}));

/** 非 React 上下文下的便捷访问 */
export const governanceStore = useGovernanceStore.getState;
