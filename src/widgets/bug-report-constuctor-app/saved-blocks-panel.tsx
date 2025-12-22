import React, {useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useDraggable} from '@dnd-kit/core';

import type {SavedBlocks} from './types.ts';

export type SavedBlocksTab = keyof SavedBlocks;

interface DraggableBlockProps {
  tab: SavedBlocksTab;
  text: string;
  index: number;
  onClick?: (text: string) => void;
  onRemove?: () => void;
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
    opacity: isDragging ? 0.65 : 1
  };

  if (tab === 'summary') {
    return (
      <div ref={setNodeRef} className="savedBlock" style={style} {...attributes}>
        <button
          type="button"
          className="savedBlockButton"
          onPointerDown={e => {
            // Keep focus in the Summary input (EditableHeading) while dragging/clicking summary chunks.
            // Preventing default stops the button from stealing focus and triggering Summary `onBlur`.
            e.preventDefault();
            e.stopPropagation();
          }}
          {...listeners}
          onDoubleClick={() => onClick?.(text)}
          title="Double click to insert into Summary. Drag to insert at cursor."
        >
          {text}
        </button>

        <div className="savedBlockActions">
          <Button
            inline
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onRemove?.()}
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
      onDoubleClick={() => onClick?.(text)}
    >
      <div className="savedBlockText">{text}</div>

      <div className="savedBlockActions">
        <Button
          inline
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onRemove?.()}
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

  const addBlock = () => {
    const value = newBlockText.trim();
    if (!value) {
      return;
    }

    onChangeBlocks({...blocks, [activeTab]: [...activeList, value]});
    setNewBlockText('');
  };

  const removeAt = (index: number) => {
    onChangeBlocks({...blocks, [activeTab]: activeList.filter((_, i) => i !== index)});
  };

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
              onClick={() => onChangeTab(t.id)}
              disabled={loading || saving}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="sidePanelBody">
        <div className="savedBlocksList">
          {activeList.length ? (
            activeList.map((text, index) => (
              <DraggableBlock
                key={`${activeTab}-${index}-${text}`}
                tab={activeTab}
                text={text}
                index={index}
                onClick={
                  activeTab === 'summary'
                    ? onClickInsertSummary
                    : activeTab === 'preconditions'
                      ? onClickInsertPreconditions
                      : onClickInsertStep
                }
                onRemove={() => removeAt(index)}
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
            onChange={e => setNewBlockText(e.target.value)}
            placeholder="New block…"
          />
          <Button primary onClick={addBlock} disabled={loading || saving || !newBlockText.trim()}>
            Add
          </Button>
        </div>

        <div className="actions">
          <Button primary disabled={loading || saving} onClick={onLoad}>
            {loading ? 'Loading…' : 'Load'}
          </Button>
          <Button primary disabled={loading || saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {(message || error) && (
          <div className={error ? 'status statusError' : 'status statusOk'}>
            {error ?? message}
          </div>
        )}
      </div>
    </div>
  );
};
