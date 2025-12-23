import React, {useCallback, useEffect, useRef} from 'react';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';
import {FieldDropzone, FieldComponent} from './field-component.tsx';
import {addBoundarySpaces, getSelectionFromElement, insertTextAtSelection} from '../tools/text-insert.ts';
import {useFrozenSelectionDnd} from '../tools/use-frozen-selection-dnd.ts';

export type PreconditionsRowProps = {
  dropEnabled: boolean;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  onRegisterInsertAtCursor?: (fn: ((text: string) => void) | null) => void;
};

const DEFAULT_ROWS = 5;

export const PRECONDITIONS_DROP_ID = 'issue-drop-preconditions';

function normalizePreconditionsInsertForEditing(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    // Preconditions textarea is edited as free-form text; inserting saved blocks while typing
    // should not introduce line breaks.
    .replace(/\n+/g, ' ');
}

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

  const resolveTextarea = useCallback(() => textareaRef.current, []);

  const {
    selectionRef,
    captureSelection,
    freezeSelectionForDrag,
    restoreFrozenSelection,
    resetDragState
  } = useFrozenSelectionDnd({resolveElement: resolveTextarea, selectionTrackingEnabled: true});

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
      const insertRaw = normalizePreconditionsInsertForEditing(text);
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

      // If user didn't manually focus Preconditions, do not move focus here.
      // Insert/append without relying on potentially stale selection.
      if (!isFocused) {
        onValueChange(appendLineIfNeeded(currentValue, insertRaw));
        return;
      }

      const fallback = selectionRef.current;
      const selection = getSelectionFromElement(el, fallback);
      const before = currentValue.slice(0, selection.start);
      const after = currentValue.slice(selection.end);

      // Match Summary behavior: inserting a block into free-form text should keep words separated.
      // Add spaces around the inserted chunk when needed.
      const insert = addBoundarySpaces({before, insert: insertRaw, after});

      const {next, caret} = insertTextAtSelection(currentValue, selection, insert);
      onValueChange(next);

      requestAnimationFrame(() => {
        // Keep caret only when Preconditions is still focused.
        if (document.activeElement !== el) {
          return;
        }
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

  const onDragEnd = useCallback(
    (event: {over?: {id?: unknown} | null; active: {data: {current: unknown}}}) => {
      const overId = event.over?.id;
      if (overId !== PRECONDITIONS_DROP_ID) {
        resetDragState();
        return;
      }

      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab !== 'preconditions' || !data.text) {
        resetDragState();
        return;
      }

      // Restore the frozen caret before inserting, so insertion is stable even if focus/selection
      // changed during DnD.
      restoreFrozenSelection();
      insertAtCursor(data.text);
      resetDragState();
    },
    [insertAtCursor, resetDragState, restoreFrozenSelection]
  );

  const onDragStart = useCallback(
    (event: {active: {data: {current: unknown}}}) => {
      if (!dropEnabled) {
        return;
      }

      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab !== 'preconditions') {
        return;
      }

      // Freeze selection only if Preconditions was focused; otherwise do not steal focus.
      freezeSelectionForDrag();
    },
    [dropEnabled, freezeSelectionForDrag]
  );

  const onDragCancel = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  useDndMonitor({onDragStart, onDragEnd, onDragCancel});

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      textareaRef.current = el;
      // Keep caret position up-to-date while the field stays focused.
      // Typing usually doesn't trigger `selectionchange`, so we must capture it here.
      captureSelection(el);
      onValueChange(el.value);
    },
    [captureSelection, onValueChange]
  );

  return (
    <FieldComponent label="Preconditions" htmlFor="issue-preconditions">
      <FieldDropzone isOver={isOver} setNodeRef={setNodeRef}>
        <textarea
          id="issue-preconditions"
          ref={textareaRef}
          className="fieldInput"
          placeholder="Drop Preconditions blocks here or type them…"
          value={value}
          onChange={onChange}
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
