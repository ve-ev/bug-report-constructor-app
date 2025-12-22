import React, {useCallback, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useDroppable} from '@dnd-kit/core';

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
    onChangeSteps([...steps, {id: createId(), text: value}]);
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

  const emptyHint = useMemo(() => {
    return dropEnabled
      ? 'Drag blocks from the Steps tab here, or add one above.'
      : 'Add steps above.';
  }, [dropEnabled]);

  return (
    <div ref={setNodeRef} className={isOver ? 'issueField issueStepsDropzone issueStepsDropzoneActive' : 'issueField issueStepsDropzone'}>
      <div className="issueFieldLabel">Steps to reproduce</div>

      <div className="constructorAddRow">
        <textarea
          className="fieldInput"
          placeholder="Describe a step…"
          value={newStep}
          onChange={e => setNewStep(e.target.value)}
          rows={2}
        />
        <Button primary onClick={addStep} disabled={!canAdd}>
          Add
        </Button>
      </div>

      <div className={isOver ? 'dropList dropListActive issueStepsDropList' : 'dropList issueStepsDropList'}>
        {steps.length ? (
          <ol className="itemsList">
            {steps.map((s, idx) => (
              <li key={s.id} className="itemsListItem">
                <span className="itemsListText">{s.text}</span>
                <div className="itemsListActions">
                  <Button inline disabled={idx === 0} onClick={() => moveUp(idx)}>
                    Up
                  </Button>
                  <Button inline disabled={idx >= steps.length - 1} onClick={() => moveDown(idx)}>
                    Down
                  </Button>
                  <Button inline onClick={() => remove(idx)}>
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
    </div>
  );
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
