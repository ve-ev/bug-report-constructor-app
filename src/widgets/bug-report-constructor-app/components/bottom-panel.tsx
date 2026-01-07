import React, {useEffect} from 'react';

import type {ColorScheme, ViewMode} from '../types.ts';
import {TwButton} from './ui/tw-button.tsx';

function isCreateDraftHotkey(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
}

export type BottomPanelProps = {
  viewMode: ViewMode;

  colorScheme: ColorScheme;
  onColorSchemeChange: (next: ColorScheme) => void;

  createDraftDisabled: boolean;
  onCreateDraft: () => void;
};

export const BottomPanel: React.FC<BottomPanelProps> = ({
  viewMode,
  colorScheme,
  onColorSchemeChange,
  createDraftDisabled,
  onCreateDraft
}) => {
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

  const onSchemeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.currentTarget.value as ColorScheme;
    if (next !== 'blue' && next !== 'magenta') {
      return;
    }
    onColorSchemeChange(next);
  };

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
      <div className="pointer-events-auto border-t border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-5 py-3 shadow-lg">
        <div className={viewMode === 'fixed' ? 'mx-auto w-full max-w-[1200px]' : 'w-full'}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1" aria-label="Color scheme">
              <label
                className="group inline-flex cursor-pointer items-center rounded-sm outline-none focus-within:ring-2 focus-within:ring-[var(--ring-border-accent-color)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--ring-content-background-color)]"
                title="Blue"
              >
                <input
                  type="radio"
                  name="colorScheme"
                  value="blue"
                  checked={colorScheme === 'blue'}
                  onChange={onSchemeInputChange}
                  className="sr-only"
                  aria-label="Blue scheme"
                />
                <span
                  className={
                    'h-4 w-4 rounded-full shadow-sm transition group-hover:shadow'
                  }
                  style={{backgroundColor: 'rgb(51, 105, 214)'}}
                />
              </label>

              <label
                className="group inline-flex cursor-pointer items-center rounded-sm outline-none focus-within:ring-2 focus-within:ring-[var(--ring-border-accent-color)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--ring-content-background-color)]"
                title="Magenta"
              >
                <input
                  type="radio"
                  name="colorScheme"
                  value="magenta"
                  checked={colorScheme === 'magenta'}
                  onChange={onSchemeInputChange}
                  className="sr-only"
                  aria-label="Magenta scheme"
                />
                <span
                  className={
                    'h-4 w-4 rounded-full shadow-sm transition group-hover:shadow'
                  }
                  style={{backgroundColor: 'rgb(255, 0, 140)'}}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
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
    </div>
  );
};
