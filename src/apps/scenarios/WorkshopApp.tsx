import ScenarioApp, { type ScenarioConfig } from './ScenarioApp';
import type { UserRole } from '../../harness/types';

interface Props {
  role: UserRole;
  studentId?: string;
  onOpenWiki?: (nodeId: string) => void;
}

const CONFIG: ScenarioConfig = { scenario: 'workshop', icon: '🏭' };

export default function WorkshopApp(props: Props) {
  return <ScenarioApp config={CONFIG} {...props} />;
}
