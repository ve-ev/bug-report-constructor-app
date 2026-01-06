import React from 'react';

import type {SavedBlocksTab} from './sidepanel/saved-blocks-panel.tsx';

export type ActiveDrag = {
  tab: SavedBlocksTab;
  text: string;
};

export type ActiveDragOverlayProps = {
  activeDrag: ActiveDrag | null;
};

export const ActiveDragOverlay: React.FC<ActiveDragOverlayProps> = ({activeDrag}) => {
  if (!activeDrag) {
    return null;
  }

  return (
    <div
      className="w-[min(520px,calc(100vw-24px))] rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 shadow-lg"
      style={{background: 'color-mix(in srgb, var(--ring-content-background-color) 92%, transparent)'}}
    >
      <div className="whitespace-pre-wrap break-words text-[13px] leading-5">{activeDrag.text}</div>
    </div>
  );
};
