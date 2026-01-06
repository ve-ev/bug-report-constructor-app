import React from 'react';

import type {AdaptiveFieldConfig, AdaptiveFieldKey} from '../../../utils/template-ui.ts';
import type {SavedBlocksTab} from '../sidepanel/saved-blocks-panel.tsx';
import type {StepItem} from './steps-constructor.tsx';
import {PreconditionsRow} from './preconditions-row.tsx';
import {StepsConstructor} from './steps-constructor.tsx';
import {FieldComponent} from '../../ui/field-component.tsx';
import {Optional} from '../../ui/optional.tsx';
import {TwButton} from '../../ui/tw-button.tsx';
import {TwTextarea} from '../../ui/tw-textarea.tsx';

export type IssueFormProps = {
  adaptiveFields: Record<AdaptiveFieldKey, AdaptiveFieldConfig>;
  activeDrag: {tab: SavedBlocksTab; text: string} | null;

  preconditions: string;
  onPreconditionsChange: (next: string) => void;
  onRegisterPreconditionsInsert: (fn: ((text: string) => void) | null) => void;
  onPreconditionsFocused: () => void;
  onSavePreconditionsSelection: (text: string) => Promise<void>;
  onSavePreconditionsToSavedBlocks: () => void;

  steps: StepItem[];
  onChangeSteps: (next: StepItem[]) => void;
  stepsDropEnabled: boolean;
  onStepsFocused: () => void;
  onSaveStep: (text: string) => Promise<void>;
  savedStepBlocks: string[];

  expected: string;
  onExpectedChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  actual: string;
  onActualChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  additionalInfo: string;
  onAdditionalInfoChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export const IssueForm: React.FC<IssueFormProps> = props => {
  const {
    adaptiveFields,
    activeDrag,
    preconditions,
    onPreconditionsChange,
    onRegisterPreconditionsInsert,
    onPreconditionsFocused,
    onSavePreconditionsSelection,
    onSavePreconditionsToSavedBlocks,
    steps,
    onChangeSteps,
    stepsDropEnabled,
    onStepsFocused,
    onSaveStep,
    savedStepBlocks,
    expected,
    onExpectedChange,
    actual,
    onActualChange,
    additionalInfo,
    onAdditionalInfoChange
  } = props;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-6">
        <Optional when={adaptiveFields.preconditions.visible}>
          <PreconditionsRow
            label={adaptiveFields.preconditions.label}
            dropEnabled={activeDrag?.tab === 'preconditions'}
            value={preconditions}
            onValueChange={onPreconditionsChange}
            onRegisterInsertAtCursor={onRegisterPreconditionsInsert}
            onFocused={onPreconditionsFocused}
            onSaveSelection={onSavePreconditionsSelection}
          />

          <div className="flex flex-wrap items-center gap-2">
            <TwButton disabled={!preconditions.trim()} onClick={onSavePreconditionsToSavedBlocks}>
              Save Preconditions to Saved Blocks
            </TwButton>
          </div>
        </Optional>

        <Optional when={adaptiveFields.steps.visible}>
          <StepsConstructor
            label={adaptiveFields.steps.label}
            steps={steps}
            onChangeSteps={onChangeSteps}
            dropEnabled={stepsDropEnabled}
            onFocused={onStepsFocused}
            onSaveStep={onSaveStep}
            savedStepBlocks={savedStepBlocks}
          />
        </Optional>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Optional when={adaptiveFields.expected.visible}>
            <FieldComponent label={adaptiveFields.expected.label} htmlFor="expected">
              <TwTextarea id="expected" rows={6} value={expected} onChange={onExpectedChange}/>
            </FieldComponent>
          </Optional>

          <Optional when={adaptiveFields.actual.visible}>
            <FieldComponent label={adaptiveFields.actual.label} htmlFor="actual">
              <TwTextarea id="actual" rows={6} value={actual} onChange={onActualChange}/>
            </FieldComponent>
          </Optional>
        </div>

        <Optional when={adaptiveFields.additionalInfo.visible}>
          <FieldComponent label={adaptiveFields.additionalInfo.label} htmlFor="additionalInfo">
            <TwTextarea id="additionalInfo" rows={6} value={additionalInfo} onChange={onAdditionalInfoChange}/>
          </FieldComponent>
        </Optional>
      </div>
    </div>
  );
};
