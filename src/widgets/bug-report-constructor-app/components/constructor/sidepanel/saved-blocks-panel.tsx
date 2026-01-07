import React, {useCallback, useMemo, useState} from 'react';
import {useDraggable} from '@dnd-kit/core';
import {PlusIcon, XMarkIcon} from '@heroicons/react/20/solid';

import type {SavedBlocks} from '../../../types.ts';
import {computeIsBusy, computeStatus} from '../../../tools/ui-state.ts';
import {HoldToConfirmButton} from '../../ui/hold-to-confirm-button.tsx';
import {TwButton} from '../../ui/tw-button.tsx';
import {TwButtonGroup} from '../../ui/tw-button-group.tsx';

export type SavedBlocksTab = keyof SavedBlocks;

interface DraggableBlockProps {
  tab: SavedBlocksTab;
  text: string;
  index: number;
  onClick?: (text: string) => void;
  onRemove?: (index: number) => void;
}

const DRAGGING_OPACITY = 0.65;

function isTextEditingTarget(el: Element | null): boolean {
  if (!el) {
    return false;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return true;
  }
  return (el as HTMLElement).isContentEditable;
}

function computeCanAdd(params: {newBlockText: string; isBusy: boolean}): boolean {
  return !!params.newBlockText.trim() && !params.isBusy;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({tab, text, index, onClick, onRemove}) => {
  const id = `${tab}:${index}`;
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id,
    data: {
      tab,
      text
    }
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? DRAGGING_OPACITY : 1
  };

  const onSummaryButtonPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    // Keep focus in the currently focused input/textarea while interacting with saved blocks.
    // Preventing default stops the button from stealing focus and triggering field `onBlur`,
    // but we must NOT stop propagation (dnd-kit listeners need this event to start dragging).
    if (isTextEditingTarget(document.activeElement)) {
      e.preventDefault();
    }
  }, []);

  const onBlockPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Keep focus in the currently focused input/textarea while starting DnD.
    // Otherwise selection may be lost and the drop would insert at the end.
    if (isTextEditingTarget(document.activeElement)) {
      e.preventDefault();
    }
  }, []);

  const onSavedBlockActionPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
  }, []);

  const onBlockDoubleClick = useCallback(() => {
    onClick?.(text);
  }, [onClick, text]);

  const onRemoveClick = useCallback(() => {
    onRemove?.(index);
  }, [index, onRemove]);

  if (tab === 'summary') {
    return (
      <div
        ref={setNodeRef}
        className="group flex cursor-grab items-start justify-between gap-2 rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-2 hover:bg-[color-mix(in_srgb,var(--ring-main-color)_10%,transparent)] active:cursor-grabbing active:bg-[color-mix(in_srgb,var(--ring-main-color)_18%,transparent)]"
        style={style}
        {...attributes}
      >
        <button
          type="button"
          className="min-w-0 flex-1 rounded px-2 py-1 text-left text-[13px] leading-5"
          onPointerDownCapture={onSummaryButtonPointerDown}
          {...listeners}
          onDoubleClick={onBlockDoubleClick}
          title="Double click to insert into Summary. Drag to insert at cursor."
        >
          <span className="whitespace-pre-wrap break-words">{text}</span>
        </button>

        <div className="shrink-0">
          <TwButton
            size="xs"
            variant="dangerGhost"
            onPointerDown={onSavedBlockActionPointerDown}
            onClick={onRemoveClick}
            title="Remove block"
            disabled={!onRemove}
            aria-label="Remove block"
          >
            <XMarkIcon className="h-4 w-4"/>
          </TwButton>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="group flex cursor-grab items-start justify-between gap-2 rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-2 hover:bg-[color-mix(in_srgb,var(--ring-main-color)_10%,transparent)] active:cursor-grabbing active:bg-[color-mix(in_srgb,var(--ring-main-color)_18%,transparent)]"
      style={style}
      title="Double click to insert. Drag into a section."
      onPointerDownCapture={onBlockPointerDown}
      {...attributes}
      {...listeners}
      onDoubleClick={onBlockDoubleClick}
    >
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-words px-2 py-1 text-[13px] leading-5">{text}</div>

      <div className="shrink-0">
        <TwButton
          size="xs"
          variant="dangerGhost"
          onPointerDown={onSavedBlockActionPointerDown}
          onClick={onRemoveClick}
          title="Remove block"
          disabled={!onRemove}
          aria-label="Remove block"
        >
          <XMarkIcon className="h-4 w-4"/>
        </TwButton>
      </div>
    </div>
  );
};

export interface SavedBlocksPanelProps {
  blocks: SavedBlocks;
  activeTab: SavedBlocksTab;
  onChangeTab: (tab: SavedBlocksTab) => void;
  onChangeBlocks: (next: SavedBlocks) => void;
  onClickInsertSummary: (text: string) => void;
  onClickInsertPreconditions: (text: string) => void;
  onClickInsertStep: (text: string) => void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
}

export const SavedBlocksPanel: React.FC<SavedBlocksPanelProps> = props => {
  const {
    blocks,
    activeTab,
    onChangeTab,
    onChangeBlocks,
    onClickInsertSummary,
    onClickInsertPreconditions,
    onClickInsertStep,
    loading,
    saving,
    error,
    message
  } = props;

  const [newBlockText, setNewBlockText] = useState('');

  const activeList = useMemo(() => blocks[activeTab], [activeTab, blocks]);

  const insertByTab = useMemo(() => {
    return {
      summary: onClickInsertSummary,
      preconditions: onClickInsertPreconditions,
      steps: onClickInsertStep
    } satisfies Record<SavedBlocksTab, (text: string) => void>;
  }, [onClickInsertPreconditions, onClickInsertStep, onClickInsertSummary]);

  const onInsert = insertByTab[activeTab];

  const blockItems = useMemo(() => {
    return activeList.map((text, index) => ({
      id: `${activeTab}:${index}:${text}`,
      text,
      index
    }));
  }, [activeList, activeTab]);

  const isBusy = computeIsBusy(loading, saving);
  const canAdd = computeCanAdd({newBlockText, isBusy});
  const {showStatus, statusClassName, statusText} = computeStatus({message, error});

  const addBlock = useCallback(() => {
    const value = newBlockText.trim();
    if (!value) {
      return;
    }

    onChangeBlocks({...blocks, [activeTab]: [...activeList, value]});
    setNewBlockText('');
  }, [activeList, activeTab, blocks, newBlockText, onChangeBlocks]);

  const clearActiveGroup = useCallback(() => {
    if (!activeList.length) {
      return;
    }
    if (isBusy) {
      return;
    }
    onChangeBlocks({...blocks, [activeTab]: []});
  }, [activeList.length, activeTab, blocks, isBusy, onChangeBlocks]);

  const removeAt = useCallback(
    (index: number) => {
      onChangeBlocks({...blocks, [activeTab]: activeList.filter((_, i) => i !== index)});
    },
    [activeList, activeTab, blocks, onChangeBlocks]
  );

  const onTabChange = useCallback((next: SavedBlocksTab) => onChangeTab(next), [onChangeTab]);

  const onChangeNewBlockText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBlockText(e.target.value);
  }, []);

  const onNewBlockKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || e.shiftKey) {
        return;
      }
      // Avoid interfering with IME composition.
      if (e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      if (!canAdd) {
        return;
      }
      addBlock();
    },
    [addBlock, canAdd]
  );

  const tabButtons: Array<{id: SavedBlocksTab; label: string}> = [
    {id: 'summary', label: 'Summary'},
    {id: 'preconditions', label: 'Preconditions'},
    {id: 'steps', label: 'Steps'}
  ];

  return (
    <div className="overflow-hidden rounded-md border border-[var(--ring-borders-color)] border-l-4 border-l-[var(--ring-main-color)] bg-[var(--ring-content-background-color)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--ring-main-color)_20%,transparent)]">
      <div className="flex flex-col gap-2 border-b border-[var(--ring-borders-color)] p-3">
        <div className="text-[13px] font-semibold">Saved Blocks</div>
        <div className="flex flex-wrap gap-2">
          <TwButtonGroup items={tabButtons} value={activeTab} onChange={onTabChange} disabled={isBusy}/>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-2">
          {activeList.length ? (
            blockItems.map(item => (
              <DraggableBlock
                key={item.id}
                tab={activeTab}
                text={item.text}
                index={item.index}
                onClick={onInsert}
                onRemove={removeAt}
              />
            ))
          ) : (
            <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
              No saved blocks yet
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-[var(--ring-border-accent-color)]"
            value={newBlockText}
            onChange={onChangeNewBlockText}
            onKeyDown={onNewBlockKeyDown}
            placeholder="New block…"
          />
          <TwButton
            variant="primary"
            onClick={addBlock}
            disabled={!canAdd}
            aria-label="Add block"
            title="Add block"
          >
            <PlusIcon className="h-4 w-4"/>
          </TwButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HoldToConfirmButton
            variant="dangerGhost"
            disabled={isBusy || !activeList.length}
            holdMs={1500}
            onHoldComplete={clearActiveGroup}
            title="Hold for 1.5 seconds to delete"
            aria-label="Delete all in group (hold for 1.5 seconds)"
          >
            Delete all in group
          </HoldToConfirmButton>
        </div>

        {showStatus ? <div className={statusClassName}>{statusText}</div> : null}
      </div>
    </div>
  );
};
