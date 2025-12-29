import React, {useCallback, useMemo, useState} from 'react';
import {CSS} from '@dnd-kit/utilities';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {BookmarkIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon} from '@heroicons/react/20/solid';
import {useDndContext, useDroppable} from '@dnd-kit/core';

import {FieldDropzone, FieldComponent} from './field-component.tsx';
import {createId} from '../tools/id.ts';
import {TwButton} from './tw-button.tsx';

export const STEPS_DROP_ID = 'issue-drop-steps';

export interface StepItem {
  id: string;
  text: string;
}

export interface StepsConstructorProps {
  steps: StepItem[];
  onChangeSteps: (next: StepItem[]) => void;
  dropEnabled: boolean;
  label?: string;
  onFocused?: () => void;
  onStepAdded?: (text: string) => void;
  onSaveStep?: (text: string) => void;
  savedStepBlocks?: string[];
}

const SortableStepRow: React.FC<{
  id: string;
  idx: number;
  text: string;
  stepsCount: number;
  isSaved: boolean;
  onSaveClick: (e: React.MouseEvent<HTMLElement>) => void;
  onMoveUpClick: (e: React.MouseEvent<HTMLElement>) => void;
  onMoveDownClick: (e: React.MouseEvent<HTMLElement>) => void;
  onRemoveClick: (e: React.MouseEvent<HTMLElement>) => void;
}> = ({
  id,
  idx,
  text,
  stepsCount,
  isSaved,
  onSaveClick,
  onMoveUpClick,
  onMoveDownClick,
  onRemoveClick
}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id,
    data: {
      type: 'step'
    }
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        'rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)]' +
        (isDragging ? ' opacity-70' : '')
      }
    >
      <div className="flex items-stretch">
        <div className="flex w-9 shrink-0 items-center justify-center border-r border-[var(--ring-borders-color)] text-[12px] font-semibold opacity-70">
          {idx + 1}
        </div>

        <div
          className="flex min-w-0 flex-1 items-center justify-between gap-3 p-3"
          {...attributes}
          {...listeners}
        >
          <div className="min-w-0">
            <div className="whitespace-pre-wrap break-words text-[13px] leading-5">{text}</div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {!isSaved ? (
              <TwButton
                size="xs"
                variant="ghost"
                data-index={idx}
                onClick={onSaveClick}
                aria-label="Save step to Saved Blocks"
                title="Save to Saved Blocks"
              >
                <BookmarkIcon className="h-4 w-4"/>
              </TwButton>
            ) : null}

            <TwButton
              size="xs"
              variant="ghost"
              disabled={idx === 0}
              data-index={idx}
              onClick={onMoveUpClick}
              aria-label="Move step up"
              title="Move up"
            >
              <ChevronUpIcon className="h-4 w-4"/>
            </TwButton>
            <TwButton
              size="xs"
              variant="ghost"
              disabled={idx >= stepsCount - 1}
              data-index={idx}
              onClick={onMoveDownClick}
              aria-label="Move step down"
              title="Move down"
            >
              <ChevronDownIcon className="h-4 w-4"/>
            </TwButton>
            <TwButton
              size="xs"
              variant="dangerGhost"
              data-index={idx}
              onClick={onRemoveClick}
              aria-label="Remove step"
              title="Remove"
            >
              <XMarkIcon className="h-4 w-4"/>
            </TwButton>
          </div>
        </div>
      </div>
    </li>
  );
};

export const StepsConstructor: React.FC<StepsConstructorProps> = ({
  steps,
  onChangeSteps,
  dropEnabled,
  label = 'Steps to reproduce',
  onFocused,
  onStepAdded,
  onSaveStep,
  savedStepBlocks = []
}) => {
  const [newStep, setNewStep] = useState('');

  const {over} = useDndContext();

  const normalizeText = useCallback((text: string) => {
    return text
      .replace(/\r\n/g, '\n')
      .trim()
      .replace(/\s+/g, ' ');
  }, []);

  const savedStepSet = useMemo(() => {
    return new Set(savedStepBlocks.map(normalizeText).filter(Boolean));
  }, [normalizeText, savedStepBlocks]);

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

  const isStepsAreaOver = useMemo(() => {
    if (isOver) {
      return true;
    }

    // When hovering over sortable step rows, `over` points to the row droppable,
    // not the container (`STEPS_DROP_ID`). For Saved Blocks → Steps drags we still
    // want to highlight the whole Steps drop area.
    if (!dropEnabled) {
      return false;
    }

    const overData = over?.data.current as {type?: string} | undefined;
    return overData?.type === 'step';
  }, [dropEnabled, isOver, over?.data]);

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

  const onNewStepKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter') {
        return;
      }

      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }

      e.preventDefault();
      addStep();
    },
    [addStep]
  );

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

  const onSaveClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const raw = (e.currentTarget as HTMLElement).dataset.index;
      const idx = raw ? Number(raw) : NaN;
      if (!Number.isFinite(idx)) {
        return;
      }

      const t = steps[idx]?.text;
      if (t) {
        onSaveStep?.(t);
      }
    },
    [onSaveStep, steps]
  );

  const emptyHint = useMemo(() => {
    return dropEnabled
      ? 'Drag blocks from the Steps tab here, or add one above'
      : 'Add steps above';
  }, [dropEnabled]);

  const stepIds = useMemo(() => steps.map(s => s.id), [steps]);

  return (
    <div onFocusCapture={onFocusCapture}>
      <FieldComponent label={label}>
        <FieldDropzone isOver={isStepsAreaOver} setNodeRef={setNodeRef} className="p-3">
          <div className="flex flex-col gap-2">
            {steps.length ? (
              <ol className="flex flex-col gap-2 list-none p-0">
                <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                  {steps.map((s, idx) => (
                    <SortableStepRow
                      key={s.id}
                      id={s.id}
                      idx={idx}
                      text={s.text}
                      isSaved={savedStepSet.has(normalizeText(s.text))}
                      onSaveClick={onSaveClick}
                      onMoveUpClick={onMoveUpClick}
                      onMoveDownClick={onMoveDownClick}
                      onRemoveClick={onRemoveClick}
                      stepsCount={steps.length}
                    />
                  ))}
                </SortableContext>
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
                <div className="flex items-end gap-2">
                  <textarea
                    id="issue-new-step"
                    className="h-10 min-w-0 flex-1 resize-y rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                    placeholder="Describe a step…"
                    value={newStep}
                    onChange={onNewStepChange}
                    onKeyDown={onNewStepKeyDown}
                    rows={1}
                  />
                  <TwButton
                    variant="primary"
                    onClick={addStep}
                    disabled={!canAdd}
                    aria-label="Add step"
                    title="Add step"
                  >
                    <PlusIcon className="h-4 w-4"/>
                  </TwButton>
                </div>
              </div>
            </div>
          </div>
        </FieldDropzone>
      </FieldComponent>
    </div>
  );
};
