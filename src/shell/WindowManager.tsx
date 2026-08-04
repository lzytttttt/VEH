import { useWindowStore } from '../stores/windowStore';
import Window from './Window';

export default function WindowManager() {
  const windows = useWindowStore((s) => s.windows);
  const activeId = useWindowStore((s) => s.getActiveId());

  return (
    <>
      {windows.map((w) => (
        <Window key={w.id} instance={w} isActive={activeId === w.id}>
          {w.content}
        </Window>
      ))}
    </>
  );
}
