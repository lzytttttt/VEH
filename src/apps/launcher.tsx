import { lazy, Suspense, type ReactNode } from 'react';
import { findApp, type AppRole } from './registry';
import AboutApp from './AboutApp';
import PlaceholderApp from './PlaceholderApp';
import WikiApp from './WikiApp';
import ReportApp from './ReportApp';
import ProfileApp from './ProfileApp';
import NotesApp from './NotesApp';
import ClassroomApp from './scenarios/ClassroomApp';
import PEApp from './scenarios/PEApp';
import LabApp from './scenarios/LabApp';
import WorkshopApp from './scenarios/WorkshopApp';
import MicroLessonApp from './scenarios/MicroLessonApp';

// 能力提升 App 懒加载（独立 chunk）
const TeacherDrillApp = lazy(() => import('./TeacherDrillApp'));
const LearningGameApp = lazy(() => import('./LearningGameApp'));

// 学校治理 App 懒加载（独立 chunk）
const DashboardApp = lazy(() => import('./DashboardApp'));
const AdminConsoleApp = lazy(() => import('./AdminConsoleApp'));
const GradeAnalysisApp = lazy(() => import('./GradeAnalysisApp'));

// 管理门户 App 懒加载（登录后默认弹出，独立 chunk 不拖慢首屏）
const PortalApp = lazy(() => import('./PortalApp'));

/**
 * 应用启动器：根据 appId 返回对应窗口内容。
 */
export function launchApp(
  appId: string,
  role: AppRole,
  _onOpenWiki?: (nodeId: string) => void
): ReactNode {
  const app = findApp(appId);
  if (!app) return <div className="p-4">未找到应用：{appId}</div>;

  const userRole = (role === 'admin' ? 'teacher' : role) as 'teacher' | 'student';
  const scenarioProps = {
    role: userRole,
    studentId: userRole === 'student' ? 's1' : undefined,
  };

  switch (appId) {
    case 'about':
      return <AboutApp />;
    case 'portal':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载管理门户...</div>}>
          <PortalApp />
        </Suspense>
      );
    case 'wiki':
      return <WikiApp />;
    case 'report':
      return <ReportApp role={userRole} />;
    case 'profile':
      return <ProfileApp role={userRole} />;
    case 'notes':
      return <NotesApp />;
    case 'teacher-drill':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载教师演练...</div>}>
          <TeacherDrillApp />
        </Suspense>
      );
    case 'learning-game':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载学生闯关...</div>}>
          <LearningGameApp />
        </Suspense>
      );
    case 'dashboard':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载校长驾驶舱...</div>}>
          <DashboardApp />
        </Suspense>
      );
    case 'admin-console':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载教务管理台...</div>}>
          <AdminConsoleApp />
        </Suspense>
      );
    case 'grade-analysis':
      return (
        <Suspense fallback={<div className="p-4" style={{ fontSize: '12px' }}>▌ 加载年级分析台...</div>}>
          <GradeAnalysisApp />
        </Suspense>
      );
    case 'classroom':
      return <ClassroomApp {...scenarioProps} />;
    case 'pe':
      return <PEApp {...scenarioProps} />;
    case 'lab':
      return <LabApp {...scenarioProps} />;
    case 'workshop':
      return <WorkshopApp {...scenarioProps} />;
    case 'microlesson':
      return <MicroLessonApp {...scenarioProps} />;
    default:
      return <PlaceholderApp app={app} />;
  }
}
