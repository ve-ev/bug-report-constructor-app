/* eslint-disable react-refresh/only-export-components */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {EditableHeading, Levels, Size} from '@jetbrains/ring-ui-built/components/editable-heading/editable-heading';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';

const SUMMARY_AUTOSAVE_MS = 650;

export const SUMMARY_DROP_ID = 'issue-drop-summary';

function normalizeSingleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').trim();
}

export function appendSummaryChunk(prev: string, text: string): string {
  const chunk = normalizeSingleLine(text);
  if (!chunk) {
    return prev;
  }
  const base = prev.trim();
  return base ? `${base} ${chunk}` : chunk;
}

export type IssueSummaryRowProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onRegisterInsertAtCursor?: (fn: (text: string) => void) => void;
};

export const IssueSummaryRow: React.FC<IssueSummaryRowProps> = ({
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
      const clean = normalizeSingleLine(text);
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
      const last = selectionRef.current;

      const rawStart = isFocused ? (el.selectionStart ?? current.length) : (last?.start ?? current.length);
      const rawEnd = isFocused ? (el.selectionEnd ?? current.length) : (last?.end ?? current.length);
      const start = Math.max(0, Math.min(current.length, rawStart));
      const end = Math.max(0, Math.min(current.length, rawEnd));
      const before = current.slice(0, start);
      const after = current.slice(end);

      const next = `${before}${clean}${after}`;
      onValueChange(next);

      requestAnimationFrame(() => {
        el.focus?.();
        const caret = start + clean.length;
        el.setSelectionRange?.(caret, caret);
        selectionRef.current = {start: caret, end: caret};
      });
    },
    [onValueChange, value]
  );

  useEffect(() => {
    onRegisterInsertAtCursor?.(insertAtCursor);
  }, [insertAtCursor, onRegisterInsertAtCursor]);

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
    onDragEnd: event => {
      const overId = event.over?.id;
      if (overId !== SUMMARY_DROP_ID) {
        draggingSummaryChunkRef.current = false;
        dragSelectionRef.current = null;
        return;
      }
      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab !== 'summary' || !data.text) {
        draggingSummaryChunkRef.current = false;
        dragSelectionRef.current = null;
        return;
      }

      // Restore the frozen caret before inserting, so insertion is stable even if focus/selection
      // changed during DnD.
      const el = inputRef.current;
      const frozen = dragSelectionRef.current;
      if (el && frozen) {
        el.focus?.();
        const start = Math.max(0, Math.min(el.value.length, frozen.start));
        const end = Math.max(0, Math.min(el.value.length, frozen.end));
        el.setSelectionRange?.(start, end);
        selectionRef.current = {start, end};
      }
      insertAtCursor(data.text);
      draggingSummaryChunkRef.current = false;
      dragSelectionRef.current = null;
    },
    onDragCancel: () => {
      draggingSummaryChunkRef.current = false;
      dragSelectionRef.current = null;
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
    <div ref={setNodeRef} className={isOver ? 'issueSummaryRow issueDropzoneActive' : 'issueSummaryRow'}>
      <EditableHeading
        level={Levels.H1}
        size={Size.L}
        embedded
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onBlur={e => {
          if (draggingSummaryChunkRef.current) {
            return;
          }

          // Keep Summary editing until focus moves to another input field.
          // Clicking non-focusable UI (e.g., panel backgrounds) should not end editing.
          const next = (e.relatedTarget ?? null) as HTMLElement | null;
          if (!next) {
            return;
          }

          const tag = next.tagName?.toLowerCase();
          const isInputLike =
            tag === 'input' ||
            tag === 'textarea' ||
            // Some Ring UI controls might use contenteditable.
            next.getAttribute('contenteditable') === 'true';

          if (isInputLike) {
            setIsEditing(false);
          }
        }}
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
          const clean = normalizeSingleLine(pasted);
          if (!clean) {
            return;
          }
          e.preventDefault();

          const el = e.target as HTMLInputElement | HTMLTextAreaElement;
          inputRef.current = el;
          const current = el.value;
          const start = el.selectionStart ?? current.length;
          const end = el.selectionEnd ?? current.length;
          const before = current.slice(0, start);
          const after = current.slice(end);
          const next = `${before}${clean}${after}`;
          onValueChange(next);

          requestAnimationFrame(() => {
            const caret = start + clean.length;
            el.setSelectionRange?.(caret, caret);
            selectionRef.current = {start: caret, end: caret};
          });
        }}
      >
        {title}
      </EditableHeading>

      {/* prevents TS “unused state” while still making autosave observable in React DevTools */}
      <span className="issueAutosaveTick" aria-hidden>
        {autosaveTick ? '' : ''}
      </span>
    </div>
  );
};
