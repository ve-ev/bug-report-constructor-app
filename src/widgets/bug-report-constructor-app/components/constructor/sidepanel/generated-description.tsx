import React from 'react';

import {FieldComponent} from '../../ui/field-component.tsx';
import {TwButton} from '../../ui/tw-button.tsx';

function previewToggleLabel(showGeneratedDescription: boolean): string {
  return showGeneratedDescription ? 'Hide preview' : 'Show preview';
}

export type GeneratedDescriptionProps = {
  description: string;
  showGeneratedDescription: boolean;
  onToggleGeneratedDescription: () => void;

  generatedDescriptionRef: React.RefObject<HTMLTextAreaElement>;
  onGeneratedDescriptionFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onCopyDescription: () => void;
  copyStatus: string | null;
};

export const GeneratedDescription: React.FC<GeneratedDescriptionProps> = props => {
  const {
    description,
    showGeneratedDescription,
    onToggleGeneratedDescription,
    generatedDescriptionRef,
    onGeneratedDescriptionFocus,
    onCopyDescription,
    copyStatus
  } = props;

  return (
    <FieldComponent label="Generated description" htmlFor="generatedDescription">
      <div className="flex flex-col gap-2">
        <div>
          <TwButton onClick={onToggleGeneratedDescription}>{previewToggleLabel(showGeneratedDescription)}</TwButton>
        </div>

        {showGeneratedDescription ? (
          <>
            <textarea
              id="generatedDescription"
              ref={generatedDescriptionRef}
              rows={14}
              readOnly
              value={description}
              onFocus={onGeneratedDescriptionFocus}
              className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
            />
            <div>
              <TwButton variant="primary" onClick={onCopyDescription}>
                Copy to clipboard
              </TwButton>
            </div>
          </>
        ) : null}

        {copyStatus ? (
          <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
            {copyStatus}
          </div>
        ) : null}
      </div>
    </FieldComponent>
  );
};
