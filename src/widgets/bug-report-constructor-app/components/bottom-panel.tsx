import React, {useEffect} from 'react';

import type {ViewMode} from '../types.ts';
import {TwButton} from './ui/tw-button.tsx';

function isCreateDraftHotkey(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
}

export type BottomPanelProps = {
  viewMode: ViewMode;
  createDraftDisabled: boolean;
  onCreateDraft: () => void;
};

export const BottomPanel: React.FC<BottomPanelProps> = ({viewMode, createDraftDisabled, onCreateDraft}) => {
  useEffect(() => {
    if (createDraftDisabled) {
      return () => {
        // no-op
      };
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Hotkey: Ctrl+Enter
      if (!isCreateDraftHotkey(e)) {
        return;
      }
      e.preventDefault();
      onCreateDraft();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [createDraftDisabled, onCreateDraft]);

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
      <div className="pointer-events-auto border-t border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-5 py-3 shadow-lg">
        <div className={viewMode === 'fixed' ? 'mx-auto w-full max-w-[1200px]' : 'w-full'}>
          <div className="flex items-center justify-end gap-3">
            <div className="text-[12px] opacity-70" title="Hotkey: Ctrl+Enter">
              Ctrl+Enter
            </div>
            <TwButton variant="primary" disabled={createDraftDisabled} onClick={onCreateDraft}>
              Create Draft
            </TwButton>
          </div>
        </div>
      </div>
    </div>
  );
};
