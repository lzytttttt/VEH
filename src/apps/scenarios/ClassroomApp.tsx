import ScenarioApp, { type ScenarioConfig } from './ScenarioApp';
import type { UserRole } from '../../harness/types';

interface Props {
  role: UserRole;
  studentId?: string;
  onOpenWiki?: (nodeId: string) => void;
}

const CONFIG: ScenarioConfig = { scenario: 'classroom', icon: '🏫' };

export default function ClassroomApp(props: Props) {
  return <ScenarioApp config={CONFIG} {...props} />;
}
