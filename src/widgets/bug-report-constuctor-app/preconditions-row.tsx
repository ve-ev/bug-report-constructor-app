import React, {useCallback, useEffect, useRef} from 'react';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';

export type PreconditionsRowProps = {
  dropEnabled: boolean;
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  onRegisterInsertAtCursor?: (fn: ((text: string) => void) | null) => void;
};

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
  rows = 5
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
      const last = selectionRef.current;

      const rawStart = isFocused ? (el.selectionStart ?? currentValue.length) : (last?.start ?? currentValue.length);
      const rawEnd = isFocused ? (el.selectionEnd ?? currentValue.length) : (last?.end ?? currentValue.length);
      const start = Math.max(0, Math.min(currentValue.length, rawStart));
      const end = Math.max(0, Math.min(currentValue.length, rawEnd));
      const before = currentValue.slice(0, start);
      const after = currentValue.slice(end);

      const needsLeadingNewline = !!before.trim() && !before.endsWith('\n');
      const insert = needsLeadingNewline ? `\n${insertRaw}` : insertRaw;
      const next = `${before}${insert}${after}`;

      onValueChange(next);

      requestAnimationFrame(() => {
        el.focus();
        const caret = start + insert.length;
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
    <div className="issueField">
      <label className="issueFieldLabel" htmlFor="issue-preconditions">
        Preconditions
      </label>
      <div
        ref={setNodeRef}
        className={isOver ? 'issueDropzone issueDropzoneActive' : 'issueDropzone'}
      >
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
      </div>
    </div>
  );
};
