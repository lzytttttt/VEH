import { useState } from 'react';
import type { AppMeta } from '../apps/registry';

interface Props {
  app: AppMeta;
  onOpen: (app: AppMeta) => void;
}

export default function DesktopIcon({ app, onOpen }: Props) {
  const [selected, setSelected] = useState(false);
  const clickRef = useState<{ lastClick: number }>({ lastClick: 0 })[0];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(true);
    const now = Date.now();
    if (now - clickRef.lastClick < 350) {
      onOpen(app);
    }
    clickRef.lastClick = now;
  };

  return (
    <div
      className={`win-desktop-icon ${selected ? 'is-selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={() => onOpen(app)}
      tabIndex={0}
    >
      <div
        className="win-icon-img relative flex items-center justify-center"
        style={{
          width: '36px',
          height: '36px',
          fontSize: '30px',
          lineHeight: 1,
          imageRendering: 'pixelated',
          filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.45))',
        }}
      >
        {app.icon}
      </div>
      <div className="win-desktop-icon-label">{app.name}</div>
    </div>
  );
}
