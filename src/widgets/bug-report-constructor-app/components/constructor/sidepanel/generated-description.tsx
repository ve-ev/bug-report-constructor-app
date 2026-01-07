import React from 'react';

import {FieldComponent} from '../../ui/field-component.tsx';
import {TwButton} from '../../ui/tw-button.tsx';

export type GeneratedDescriptionProps = {
  description: string;
  generatedDescriptionRef: React.RefObject<HTMLTextAreaElement>;
  onGeneratedDescriptionFocus: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onCopyDescription: () => void;
  copyStatus: string | null;
};

export const GeneratedDescription: React.FC<GeneratedDescriptionProps> = props => {
  const {
    description,
    generatedDescriptionRef,
    onGeneratedDescriptionFocus,
    onCopyDescription,
    copyStatus
  } = props;

  return (
    <FieldComponent label="Generated description" htmlFor="generatedDescription" collapsible defaultCollapsed>
      <div className="flex flex-col gap-3">
        <textarea
          id="generatedDescription"
          ref={generatedDescriptionRef}
          rows={14}
          readOnly
          value={description}
          onFocus={onGeneratedDescriptionFocus}
          className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-[var(--ring-border-accent-color)]"
        />
        <div>
          <TwButton variant="primary" onClick={onCopyDescription}>
            Copy to clipboard
          </TwButton>
        </div>

        {copyStatus ? (
          <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
            {copyStatus}
          </div>
        ) : null}
      </div>
    </FieldComponent>
  );
};
