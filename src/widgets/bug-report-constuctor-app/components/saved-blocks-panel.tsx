import React, {useCallback, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useDraggable} from '@dnd-kit/core';

import type {SavedBlocks} from '../types.ts';
import {computeIsBusy, computeLoadSaveTitles, computeStatus} from '../tools/ui-state.ts';

export type SavedBlocksTab = keyof SavedBlocks;

interface DraggableBlockProps {
  tab: SavedBlocksTab;
  text: string;
  index: number;
  onClick?: (text: string) => void;
  onRemove?: (index: number) => void;
}

const DRAGGING_OPACITY = 0.65;

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
    // Keep focus in the Summary input (EditableHeading) while dragging/clicking summary chunks.
    // Preventing default stops the button from stealing focus and triggering Summary `onBlur`.
    e.preventDefault();
    e.stopPropagation();
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
      <div ref={setNodeRef} className="savedBlock" style={style} {...attributes}>
        <button
          type="button"
          className="savedBlockButton"
          onPointerDown={onSummaryButtonPointerDown}
          {...listeners}
          onDoubleClick={onBlockDoubleClick}
          title="Double click to insert into Summary. Drag to insert at cursor."
        >
          {text}
        </button>

        <div className="savedBlockActions">
          <Button
            inline
            onPointerDown={onSavedBlockActionPointerDown}
            onClick={onRemoveClick}
            title="Remove block"
            disabled={!onRemove}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className="savedBlock savedBlockDraggable"
      style={style}
      title="Double click to insert. Drag into a section."
      {...attributes}
      {...listeners}
      onDoubleClick={onBlockDoubleClick}
    >
      <div className="savedBlockText">{text}</div>

      <div className="savedBlockActions">
        <Button
          inline
          onPointerDown={onSavedBlockActionPointerDown}
          onClick={onRemoveClick}
          title="Remove block"
          disabled={!onRemove}
        >
          Remove
        </Button>
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
  onLoad: () => void;
  onSave: () => void;
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
    message,
    onLoad,
    onSave
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
  const {loadTitle, saveTitle} = computeLoadSaveTitles({
    loading,
    saving,
    loadIdleTitle: 'Load',
    saveIdleTitle: 'Save'
  });
  const {showStatus, statusClassName, statusText} = computeStatus({message, error});

  const addBlock = useCallback(() => {
    const value = newBlockText.trim();
    if (!value) {
      return;
    }

    onChangeBlocks({...blocks, [activeTab]: [...activeList, value]});
    setNewBlockText('');
  }, [activeList, activeTab, blocks, newBlockText, onChangeBlocks]);

  const removeAt = useCallback(
    (index: number) => {
      onChangeBlocks({...blocks, [activeTab]: activeList.filter((_, i) => i !== index)});
    },
    [activeList, activeTab, blocks, onChangeBlocks]
  );

  const onTabClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const raw = (e.currentTarget as HTMLElement).dataset.tab;
      if (!raw) {
        return;
      }
      onChangeTab(raw as SavedBlocksTab);
    },
    [onChangeTab]
  );

  const onChangeNewBlockText = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewBlockText(e.target.value);
  }, []);

  const tabButtons: Array<{id: SavedBlocksTab; label: string}> = [
    {id: 'summary', label: 'Summary'},
    {id: 'preconditions', label: 'Preconditions'},
    {id: 'steps', label: 'Steps'}
  ];

  return (
    <div className="sidePanel">
      <div className="sidePanelHeader">
        <div className="sidePanelTitle">Saved Blocks</div>
        <div className="sidePanelTabs">
          {tabButtons.map(t => (
            <Button
              key={t.id}
              primary={t.id === activeTab}
              data-tab={t.id}
              onClick={onTabClick}
              disabled={isBusy}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="sidePanelBody">
        <div className="savedBlocksList">
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
            <div className="emptyHint">No saved blocks yet.</div>
          )}
        </div>

        <div className="sidePanelAdd">
          <input
            className="fieldInput"
            value={newBlockText}
            onChange={onChangeNewBlockText}
            placeholder="New block…"
          />
          <Button primary onClick={addBlock} disabled={!canAdd}>
            Add
          </Button>
        </div>

        <div className="actions">
          <Button primary disabled={isBusy} onClick={onLoad}>
            {loadTitle}
          </Button>
          <Button primary disabled={isBusy} onClick={onSave}>
            {saveTitle}
          </Button>
        </div>

        {showStatus ? <div className={statusClassName}>{statusText}</div> : null}
      </div>
    </div>
  );
};
