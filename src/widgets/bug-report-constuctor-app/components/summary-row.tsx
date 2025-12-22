import React, {useCallback, useEffect, useRef, useState} from 'react';
import {EditableHeading, Levels, Size} from '@jetbrains/ring-ui-built/components/editable-heading/editable-heading';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';
import {SUMMARY_DROP_ID, appendSummaryChunk, normalizeSummaryInsert} from '../utils/summary-row-utils.ts';
import {getSelectionFromElement, insertTextAtSelection} from '../tools/text-insert.ts';

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
};

export const SummaryRow: React.FC<SummaryRowProps> = ({
  value,
  onValueChange,
  placeholder = 'Click to add summary',
  onRegisterInsertAtCursor
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const draggingSummaryChunkRef = useRef(false);
  const dragSelectionRef = useRef<{start: number; end: number} | null>(null);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectionRef = useRef<{start: number; end: number}>({start: 0, end: 0});

  const {isOver, setNodeRef} = useDroppable({
    id: SUMMARY_DROP_ID
  });

  const captureSelection = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (!el) {
      return;
    }
    selectionRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length
    };
  }, []);

  const resetDragState = useCallback(() => {
    draggingSummaryChunkRef.current = false;
    dragSelectionRef.current = null;
  }, []);

  const restoreFrozenSelection = useCallback(() => {
    const el = inputRef.current;
    const frozen = dragSelectionRef.current;
    if (!el || !frozen) {
      return;
    }
    el.focus?.();
    const {start, end} = getSelectionFromElement(el, frozen);
    el.setSelectionRange?.(start, end);
    selectionRef.current = {start, end};
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      const el = inputRef.current;
      if (!el) {
        return;
      }
      if (document.activeElement !== el) {
        return;
      }
      if (draggingSummaryChunkRef.current) {
        return;
      }
      captureSelection(el);
    };

    if (!isEditing) {
      return () => {
        // no-op
      };
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [captureSelection, isEditing]);

  const insertAtCursor = useCallback(
    (text: string) => {
      const clean = normalizeSummaryInsert(text);
      if (!clean) {
        return;
      }

      const el = inputRef.current;
      if (!el) {
        onValueChange(appendSummaryChunk(value, clean));
        return;
      }

      const current = el.value;
      const isFocused = document.activeElement === el;
      const fallback = selectionRef.current;
      const selection = isFocused ? getSelectionFromElement(el, fallback) : fallback;

      const {next, caret} = insertTextAtSelection(current, selection, clean);
      onValueChange(next);

      requestAnimationFrame(() => {
        el.focus?.();
        el.setSelectionRange?.(caret, caret);
        selectionRef.current = {start: caret, end: caret};
      });
    },
    [onValueChange, value]
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
    []
  );

  useEffect(() => {
    onRegisterInsertAtCursor?.(insertSummaryChunk);
  }, [insertSummaryChunk, onRegisterInsertAtCursor]);

  useDndMonitor({
    onDragStart: event => {
      if (!isEditing) {
        return;
      }
      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab === 'summary') {
        draggingSummaryChunkRef.current = true;

        // Freeze caret position for the duration of the drag.
        dragSelectionRef.current = {...selectionRef.current};

        // Ensure the caret is visible during DnD: keep Summary input focused and
        // restore last known selection.
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) {
            return;
          }
          el.focus?.();
          const frozen = dragSelectionRef.current ?? selectionRef.current;
          const start = Math.max(0, Math.min(el.value.length, frozen.start));
          const end = Math.max(0, Math.min(el.value.length, frozen.end));
          el.setSelectionRange?.(start, end);
        });
      }
    },
    onDragEnd,
    onDragCancel: () => {
      resetDragState();
    }
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

  return (
    <div ref={setNodeRef} className={isOver ? 'issueSummaryRow fieldDropzoneActive' : 'issueSummaryRow'}>
      <EditableHeading
        level={Levels.H1}
        size={Size.L}
        embedded
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onBlur={onBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditing(false);
          }
        }}
        onChange={e => {
          const el = e.target as HTMLInputElement | HTMLTextAreaElement;
          inputRef.current = el;
          captureSelection(el);
          onValueChange(el.value);
        }}
        onPaste={e => {
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
          const {next, caret} = insertTextAtSelection(current, selection, clean);
          onValueChange(next);

          requestAnimationFrame(() => {
            el.setSelectionRange?.(caret, caret);
            selectionRef.current = {start: caret, end: caret};
          });
        }}
      >
        {title}
      </EditableHeading>

      {/* prevents TS “unused state” while still making autosave observable in React DevTools */}
      <span className="fieldAutosaveTick" aria-hidden>
        {autosaveTick ? '' : ''}
      </span>
    </div>
  );
};
