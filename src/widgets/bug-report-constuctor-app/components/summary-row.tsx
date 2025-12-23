import React, {useCallback, useEffect, useRef, useState} from 'react';
import {EditableHeading, Levels, Size} from '@jetbrains/ring-ui-built/components/editable-heading/editable-heading';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';
import {SUMMARY_DROP_ID, appendSummaryChunk, normalizeSummaryInsert} from '../utils/summary-row-utils.ts';
import {addBoundarySpaces, getSelectionFromElement, insertTextAtSelection} from '../tools/text-insert.ts';
import {useFrozenSelectionDnd} from '../tools/use-frozen-selection-dnd.ts';

const SUMMARY_AUTOSAVE_MS = 650;

function isInputLikeTarget(el: HTMLElement | null): boolean {
  if (!el) {
    return false;
  }
  const tag = el.tagName?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    // Some Ring UI controls might use contenteditable.
    el.getAttribute('contenteditable') === 'true'
  );
}

export type SummaryRowProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onRegisterInsertAtCursor?: (fn: (text: string) => void) => void;
  dropEnabled?: boolean;
  onFocused?: () => void;
  onSaveSelection?: (text: string) => void;
};

export const SummaryRow: React.FC<SummaryRowProps> = ({
  value,
  onValueChange,
  placeholder = 'Click to add summary',
  onRegisterInsertAtCursor,
  dropEnabled = true,
  onFocused,
  onSaveSelection
  // eslint-disable-next-line complexity
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const resolveInput = useCallback(() => {
    const active = document.activeElement;
    const activeInput =
      active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
    const el = inputRef.current ?? activeInput;
    if (el) {
      // EditableHeading may mount the input before the first onChange; capture it when focused.
      inputRef.current = el;
    }
    return el;
  }, []);

  const {
    selectionRef,
    draggingRef: draggingSummaryChunkRef,
    captureSelection,
    freezeSelectionForDrag,
    restoreFrozenSelection,
    resetDragState
  } = useFrozenSelectionDnd({resolveElement: resolveInput, selectionTrackingEnabled: isEditing});

  const {isOver, setNodeRef} = useDroppable({
    id: SUMMARY_DROP_ID,
    disabled: !dropEnabled
  });


  const insertAtCursor = useCallback(
    (text: string) => {
      const clean = normalizeSummaryInsert(text);
      if (!clean) {
        return;
      }

      const el = resolveInput();
      if (!el) {
        onValueChange(appendSummaryChunk(value, clean));
        return;
      }

      const current = el.value;
      const isFocused = document.activeElement === el;
      if (!isFocused) {
        // Don't steal focus if user didn't manually place caret into Summary.
        onValueChange(appendSummaryChunk(value, clean));
        return;
      }

      const fallback = selectionRef.current;
      const selection = getSelectionFromElement(el, fallback);

      const before = current.slice(0, selection.start);
      const after = current.slice(selection.end);
      const insert = addBoundarySpaces({before, insert: clean, after});

      const {next, caret} = insertTextAtSelection(current, selection, insert);
      onValueChange(next);

      requestAnimationFrame(() => {
        // Keep caret only when Summary is still focused.
        if (document.activeElement !== el) {
          return;
        }
        el.setSelectionRange?.(caret, caret);
        selectionRef.current = {start: caret, end: caret};
      });
    },
    [onValueChange, resolveInput, selectionRef, value]
  );

  const insertSummaryChunk = useCallback(
    (text: string) => {
      if (!isEditing) {
        onValueChange(appendSummaryChunk(value, text));
        return;
      }

      insertAtCursor(text);
    },
    [insertAtCursor, isEditing, onValueChange, value]
  );

  const onDragEnd = useCallback(
    (event: {over?: {id?: unknown} | null; active: {data: {current: unknown}}}) => {
      const overId = event.over?.id;
      if (overId !== SUMMARY_DROP_ID) {
        resetDragState();
        return;
      }

      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab !== 'summary' || !data.text) {
        resetDragState();
        return;
      }

      if (!isEditing) {
        onValueChange(appendSummaryChunk(value, data.text));
        resetDragState();
        return;
      }

      // Restore the frozen caret before inserting, so insertion is stable even if focus/selection
      // changed during DnD.
      restoreFrozenSelection();
      insertAtCursor(data.text);
      resetDragState();
    },
    [insertAtCursor, isEditing, onValueChange, resetDragState, restoreFrozenSelection, value]
  );

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      if (draggingSummaryChunkRef.current) {
        return;
      }

      // Keep Summary editing until focus moves to another input field.
      // Clicking non-focusable UI (e.g., panel backgrounds) should not end editing.
      const next = (e.relatedTarget ?? null) as HTMLElement | null;
      if (isInputLikeTarget(next)) {
        setIsEditing(false);
      }
    },
    [draggingSummaryChunkRef]
  );

  useEffect(() => {
    onRegisterInsertAtCursor?.(insertSummaryChunk);
  }, [insertSummaryChunk, onRegisterInsertAtCursor]);

  useEffect(() => {
    if (!isEditing) {
      setSelectedText('');
      return () => {
        // no-op
      };
    }

    const onSelectionChange = () => {
      const el = resolveInput();
      if (!el) {
        setSelectedText('');
        return;
      }
      if (document.activeElement !== el) {
        setSelectedText('');
        return;
      }
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      if (start === end) {
        setSelectedText('');
        return;
      }
      setSelectedText(el.value.slice(Math.min(start, end), Math.max(start, end)));
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [isEditing, resolveInput]);

  const onSaveSelectionPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    // Preserve focus/selection in the editable input.
    if (isInputLikeTarget(document.activeElement as HTMLElement | null)) {
      e.preventDefault();
    }
  }, []);

  const onSaveSelectionClick = useCallback(() => {
    const t = selectedText.trim();
    if (!t) {
      return;
    }
    onSaveSelection?.(t);
  }, [onSaveSelection, selectedText]);

  const onSummaryDragStart = useCallback(
    (event: {active: {data: {current: unknown}}}) => {
      if (!isEditing) {
        return;
      }
      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab === 'summary') {
        // Freeze selection only if Summary was focused; otherwise do not steal focus.
        freezeSelectionForDrag();
      }
    },
    [freezeSelectionForDrag, isEditing]
  );

  const onSummaryDragCancel = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  useDndMonitor({
    onDragStart: onSummaryDragStart,
    onDragEnd,
    onDragCancel: onSummaryDragCancel
  });

  // “Autosave” for summary: debounce local commit and allow consumers to hook real persistence later.
  const [autosaveTick, setAutosaveTick] = useState(0);
  useEffect(() => {
    let t: number | undefined;
    if (isEditing) {
      t = window.setTimeout(() => {
        setAutosaveTick(v => v + 1);
      }, SUMMARY_AUTOSAVE_MS);
    }
    return () => {
      if (t !== undefined) {
        window.clearTimeout(t);
      }
    };
  }, [isEditing, value]);

  let title = placeholder;
  if (isEditing) {
    title = value;
  } else if (value.trim()) {
    title = value;
  }

  const onEdit = useCallback(() => {
    onFocused?.();
    setIsEditing(true);
  }, [onFocused]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
    }
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const el = e.target;
      inputRef.current = el;
      captureSelection(el);
      onValueChange(el.value);
    },
    [captureSelection, onValueChange]
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData('text/plain');
      const clean = normalizeSummaryInsert(pasted);
      if (!clean) {
        return;
      }
      e.preventDefault();

      const el = e.target as HTMLInputElement | HTMLTextAreaElement;
      inputRef.current = el;
      const current = el.value;
      const selection = getSelectionFromElement(el, selectionRef.current);
      const before = current.slice(0, selection.start);
      const after = current.slice(selection.end);
      const insert = addBoundarySpaces({before, insert: clean, after});

      const {next, caret} = insertTextAtSelection(current, selection, insert);
      onValueChange(next);

      requestAnimationFrame(() => {
        el.setSelectionRange?.(caret, caret);
        selectionRef.current = {start: caret, end: caret};
      });
    },
    [onValueChange, selectionRef]
  );

  return (
    <div
      ref={setNodeRef}
      className="relative"
    >
      {isEditing && selectedText.trim() ? (
        <div className="absolute right-2 top-2 z-10">
          <Button
            inline
            onPointerDown={onSaveSelectionPointerDown}
            onClick={onSaveSelectionClick}
            disabled={!onSaveSelection}
            title="Save selected text to Saved Blocks"
          >
            Save selection
          </Button>
        </div>
      ) : null}

      <div
        className={
          isOver
            ? 'rounded-md border-2 border-dashed border-sky-400 bg-sky-50/30 p-3 ring-2 ring-sky-300/30'
            : 'rounded-md border-2 border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3'
        }
      >
        <EditableHeading
          level={Levels.H1}
          size={Size.FULL}
          embedded
          isEditing={isEditing}
          onEdit={onEdit}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onChange={onChange}
          onPaste={onPaste}
        >
          {title}
        </EditableHeading>

        {/* prevents TS “unused state” while still making autosave observable in React DevTools */}
        <span className="hidden" aria-hidden>
          {autosaveTick ? '' : ''}
        </span>
      </div>
    </div>
  );
};
