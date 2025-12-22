import React, {useCallback, useEffect, useRef} from 'react';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';
import {FieldDropzone, FieldComponent} from './field-component.tsx';
import {getSelectionFromElement, insertTextAtSelection} from '../tools/text-insert.ts';

export type PreconditionsRowProps = {
  dropEnabled: boolean;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  onRegisterInsertAtCursor?: (fn: ((text: string) => void) | null) => void;
};

const DEFAULT_ROWS = 5;

export const PRECONDITIONS_DROP_ID = 'issue-drop-preconditions';

function appendLineIfNeeded(target: string, insert: string): string {
  const t = target;
  const cleanInsert = insert.trim();
  if (!cleanInsert) {
    return t;
  }
  if (!t.trim()) {
    return cleanInsert;
  }
  if (t.endsWith('\n')) {
    return `${t}${cleanInsert}`;
  }
  return `${t}\n${cleanInsert}`;
}

export const PreconditionsRow: React.FC<PreconditionsRowProps> = ({
  dropEnabled,
  value,
  onValueChange,
  onRegisterInsertAtCursor,
  rows = DEFAULT_ROWS
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{start: number; end: number}>({start: 0, end: 0});

  const {isOver, setNodeRef} = useDroppable({
    id: PRECONDITIONS_DROP_ID,
    disabled: !dropEnabled
  });

  const onSelect = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    selectionRef.current = {start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0};
  }, []);

  const insertAtCursor = useCallback(
    (text: string) => {
      const insertRaw = text.trim();
      if (!insertRaw) {
        return;
      }

      const el = textareaRef.current;
      if (!el) {
        onValueChange(appendLineIfNeeded(value, insertRaw));
        return;
      }

      const currentValue = el.value;
      const isFocused = document.activeElement === el;
      const fallback = selectionRef.current;
      const selection = isFocused ? getSelectionFromElement(el, fallback) : fallback;
      const before = currentValue.slice(0, selection.start);
      const needsLeadingNewline = !!before.trim() && !before.endsWith('\n');
      const insert = needsLeadingNewline ? `\n${insertRaw}` : insertRaw;

      const {next, caret} = insertTextAtSelection(currentValue, selection, insert);
      onValueChange(next);

      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caret, caret);
        selectionRef.current = {start: caret, end: caret};
      });
    },
    [onValueChange, value]
  );

  useEffect(() => {
    onRegisterInsertAtCursor?.(insertAtCursor);
    return () => {
      onRegisterInsertAtCursor?.(null);
    };
  }, [insertAtCursor, onRegisterInsertAtCursor]);

  useDndMonitor({
    onDragEnd: event => {
      const overId = event.over?.id;
      if (overId !== PRECONDITIONS_DROP_ID) {
        return;
      }

      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab !== 'preconditions' || !data.text) {
        return;
      }

      insertAtCursor(data.text);
    }
  });

  return (
    <FieldComponent label="Preconditions" htmlFor="issue-preconditions">
      <FieldDropzone isOver={isOver} setNodeRef={setNodeRef}>
        <textarea
          id="issue-preconditions"
          ref={textareaRef}
          className="fieldInput"
          placeholder="Drop Preconditions blocks here or type them…"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          onSelect={onSelect}
          onFocus={onSelect}
          onKeyUp={onSelect}
          onMouseUp={onSelect}
          rows={rows}
        />
      </FieldDropzone>
    </FieldComponent>
  );
};
