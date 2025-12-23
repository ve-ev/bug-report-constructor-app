import React, {useCallback, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useDroppable} from '@dnd-kit/core';

import {FieldDropzone, FieldComponent} from './field-component.tsx';
import {createId} from '../tools/id.ts';

export const STEPS_DROP_ID = 'issue-drop-steps';

export interface StepItem {
  id: string;
  text: string;
}

export interface StepsConstructorProps {
  steps: StepItem[];
  onChangeSteps: (next: StepItem[]) => void;
  dropEnabled: boolean;
  onFocused?: () => void;
  onStepAdded?: (text: string) => void;
}

export const StepsConstructor: React.FC<StepsConstructorProps> = ({
  steps,
  onChangeSteps,
  dropEnabled,
  onFocused,
  onStepAdded
}) => {
  const [newStep, setNewStep] = useState('');

  const onFocusCapture = useCallback(() => {
    onFocused?.();
  }, [onFocused]);

  const onNewStepChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewStep(e.target.value);
  }, []);

  const {isOver, setNodeRef} = useDroppable({
    id: STEPS_DROP_ID,
    disabled: !dropEnabled
  });

  const canAdd = !!newStep.trim();

  const addStep = useCallback(() => {
    const value = newStep.trim();
    if (!value) {
      return;
    }
    onStepAdded?.(value);
    onChangeSteps([...steps, {id: createId('step'), text: value}]);
    setNewStep('');
  }, [newStep, onChangeSteps, onStepAdded, steps]);

  const moveUp = useCallback(
    (idx: number) => {
      if (idx <= 0) {
        return;
      }
      const next = [...steps];
      const tmp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = tmp;
      onChangeSteps(next);
    },
    [onChangeSteps, steps]
  );

  const moveDown = useCallback(
    (idx: number) => {
      if (idx >= steps.length - 1) {
        return;
      }
      const next = [...steps];
      const tmp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = tmp;
      onChangeSteps(next);
    },
    [onChangeSteps, steps]
  );

  const remove = useCallback(
    (idx: number) => {
      onChangeSteps(steps.filter((_, i) => i !== idx));
    },
    [onChangeSteps, steps]
  );

  const onMoveUpClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const raw = (e.currentTarget as HTMLElement).dataset.index;
      const idx = raw ? Number(raw) : NaN;
      if (!Number.isFinite(idx)) {
        return;
      }
      moveUp(idx);
    },
    [moveUp]
  );

  const onMoveDownClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const raw = (e.currentTarget as HTMLElement).dataset.index;
      const idx = raw ? Number(raw) : NaN;
      if (!Number.isFinite(idx)) {
        return;
      }
      moveDown(idx);
    },
    [moveDown]
  );

  const onRemoveClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const raw = (e.currentTarget as HTMLElement).dataset.index;
      const idx = raw ? Number(raw) : NaN;
      if (!Number.isFinite(idx)) {
        return;
      }
      remove(idx);
    },
    [remove]
  );

  const emptyHint = useMemo(() => {
    return dropEnabled
      ? 'Drag blocks from the Steps tab here, or add one above.'
      : 'Add steps above.';
  }, [dropEnabled]);

  return (
    <div onFocusCapture={onFocusCapture}>
      <FieldComponent label="Steps to reproduce">
        <FieldDropzone isOver={isOver} setNodeRef={setNodeRef} className="p-3">
          <div className="flex flex-col gap-2">
            {steps.length ? (
              <ol className="flex flex-col gap-2">
                {steps.map((s, idx) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold opacity-70">Step {idx + 1}</div>
                        <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5">{s.text}</div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <Button inline disabled={idx === 0} data-index={idx} onClick={onMoveUpClick}>
                          Up
                        </Button>
                        <Button
                          inline
                          disabled={idx >= steps.length - 1}
                          data-index={idx}
                          onClick={onMoveDownClick}
                        >
                          Down
                        </Button>
                        <Button inline data-index={idx} onClick={onRemoveClick}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[13px] opacity-70">
                {emptyHint}
              </div>
            )}

            {/* Input block must be the last item in the list */}
            <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3">
              <div className="flex flex-col gap-2">
                <div className="text-[12px] font-semibold opacity-70">New step</div>
                <textarea
                  id="issue-new-step"
                  className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-sky-400/60"
                  placeholder="Describe a step…"
                  value={newStep}
                  onChange={onNewStepChange}
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button primary onClick={addStep} disabled={!canAdd}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FieldDropzone>
      </FieldComponent>
    </div>
  );
};
