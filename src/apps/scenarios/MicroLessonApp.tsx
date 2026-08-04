import ScenarioApp, { type ScenarioConfig } from './ScenarioApp';
import type { UserRole } from '../../harness/types';

interface Props {
  role: UserRole;
  studentId?: string;
  onOpenWiki?: (nodeId: string) => void;
}

const CONFIG: ScenarioConfig = { scenario: 'microlesson', icon: '🎥' };

export default function MicroLessonApp(props: Props) {
  return <ScenarioApp config={CONFIG} {...props} />;
}
