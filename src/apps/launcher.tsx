import type { ReactNode } from 'react';
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

  const userRole = role as 'teacher' | 'student';
  const scenarioProps = {
    role: userRole,
    studentId: userRole === 'student' ? 's1' : undefined,
  };

  switch (appId) {
    case 'about':
      return <AboutApp />;
    case 'wiki':
      return <WikiApp />;
    case 'report':
      return <ReportApp role={userRole} />;
    case 'profile':
      return <ProfileApp role={userRole} />;
    case 'notes':
      return <NotesApp />;
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
