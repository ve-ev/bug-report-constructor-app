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
}

export const StepsConstructor: React.FC<StepsConstructorProps> = ({steps, onChangeSteps, dropEnabled}) => {
  const [newStep, setNewStep] = useState('');

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
    onChangeSteps([...steps, {id: createId('step'), text: value}]);
    setNewStep('');
  }, [newStep, onChangeSteps, steps]);

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
    <FieldComponent label="Steps to reproduce">
      <FieldDropzone isOver={isOver} setNodeRef={setNodeRef} className="fieldDropzonePadded">
        <div className="constructorAddRow">
          <textarea
            id="issue-new-step"
            className="fieldInput"
            placeholder="Describe a step…"
            value={newStep}
            onChange={onNewStepChange}
            rows={2}
          />
          <Button primary onClick={addStep} disabled={!canAdd}>
            Add
          </Button>
        </div>

        <div className={isOver ? 'dropList dropListActive stepsDropList' : 'dropList stepsDropList'}>
          {steps.length ? (
            <ol className="itemsList">
              {steps.map((s, idx) => (
                <li key={s.id} className="itemsListItem">
                  <span className="itemsListText">{s.text}</span>
                  <div className="itemsListActions">
                    <Button inline disabled={idx === 0} data-index={idx} onClick={onMoveUpClick}>
                      Up
                    </Button>
                    <Button inline disabled={idx >= steps.length - 1} data-index={idx} onClick={onMoveDownClick}>
                      Down
                    </Button>
                    <Button inline data-index={idx} onClick={onRemoveClick}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="emptyHint">{emptyHint}</div>
          )}
        </div>
      </FieldDropzone>
    </FieldComponent>
  );
};
