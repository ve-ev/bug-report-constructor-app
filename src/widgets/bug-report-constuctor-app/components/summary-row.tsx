import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useDndMonitor, useDroppable} from '@dnd-kit/core';

import type {SavedBlocksTab} from './saved-blocks-panel.tsx';
import {SUMMARY_DROP_ID, appendSummaryChunk, normalizeSummaryInsert} from '../utils/summary-row-utils.ts';
import {addBoundarySpaces, getSelectionFromElement, insertTextAtSelection} from '../tools/text-insert.ts';
import {useFrozenSelectionDnd} from '../tools/use-frozen-selection-dnd.ts';
import {TwButton} from './tw-button.tsx';
import {FieldDropzone} from './field-component.tsx';

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

function queryEditableInput(container: HTMLDivElement | null): HTMLInputElement | HTMLTextAreaElement | null {
  if (!container) {
    return null;
  }
  return container.querySelector('input,textarea') as HTMLInputElement | HTMLTextAreaElement | null;
}

function getSelectedTextFromInput(el: HTMLInputElement | HTMLTextAreaElement | null): string | null {
  if (!el) {
    return null;
  }
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  if (start === end) {
    return '';
  }
  return el.value.slice(Math.min(start, end), Math.max(start, end));
}

function resolveDomSelection(): Selection | null {
  return window.getSelection?.() ?? null;
}

function isDomSelectionInsideContainer(sel: Selection, container: HTMLDivElement): boolean {
  if (sel.rangeCount === 0) {
    return false;
  }
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const nodeEl = node instanceof HTMLElement ? node : node.parentElement;
  return Boolean(nodeEl && container.contains(nodeEl));
}

function getSelectedTextFromDomSelection(container: HTMLDivElement | null): string | null {
  if (!container) {
    return null;
  }

  const sel = resolveDomSelection();
  if (!sel) {
    return '';
  }

  return isDomSelectionInsideContainer(sel, container) ? sel.toString() : '';
}

function shouldReadSelectionFromInput(args: {
  container: HTMLDivElement;
  input: HTMLInputElement | HTMLTextAreaElement | null;
  activeElement: HTMLElement | null;
}): args is {
  container: HTMLDivElement;
  input: HTMLInputElement | HTMLTextAreaElement;
  activeElement: HTMLElement | null;
} {
  if (!args.input) {
    return false;
  }
  if (document.activeElement === args.input) {
    return true;
  }
  return Boolean(args.activeElement && args.container.contains(args.activeElement));
}

function computeSelectedText(args: {
  container: HTMLDivElement;
  input: HTMLInputElement | HTMLTextAreaElement | null;
  activeElement: HTMLElement | null;
}): string {
  if (shouldReadSelectionFromInput(args)) {
    return getSelectedTextFromInput(args.input) ?? '';
  }

  return getSelectedTextFromDomSelection(args.container) ?? '';
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
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const resolveInput = useCallback(() => {
    const active = document.activeElement;
    const activeInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
    const queried = queryEditableInput(containerRef.current);
    const el = inputRef.current ?? activeInput ?? queried;
    if (el) {
      // Capture the input once it becomes available.
      inputRef.current = el;
    }
    return el ?? null;
  }, []);

  const {
    selectionRef,
    draggingRef: draggingSummaryChunkRef,
    captureSelection,
    freezeSelectionForDrag,
    restoreFrozenSelection,
    resetDragState
  } = useFrozenSelectionDnd({resolveElement: resolveInput, selectionTrackingEnabled: isFocused});

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
      const inputIsFocused = document.activeElement === el;
      if (!inputIsFocused) {
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
      insertAtCursor(text);
    },
    [insertAtCursor]
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

      // Restore the frozen caret before inserting, so insertion is stable even if focus/selection
      // changed during DnD.
      restoreFrozenSelection();
      insertAtCursor(data.text);
      resetDragState();
    },
    [insertAtCursor, resetDragState, restoreFrozenSelection]
  );

  const onBlur = useCallback(
    () => {
      if (draggingSummaryChunkRef.current) {
        return;
      }

      setIsFocused(false);
    },
    [draggingSummaryChunkRef]
  );

  useEffect(() => {
    onRegisterInsertAtCursor?.(insertSummaryChunk);
  }, [insertSummaryChunk, onRegisterInsertAtCursor]);

  useEffect(() => {
    const onSelectionChange = () => {
      const container = containerRef.current;
      if (!container) {
        setSelectedText('');
        return;
      }

      setSelectedText(
        computeSelectedText({
          container,
          input: resolveInput(),
          activeElement: document.activeElement as HTMLElement | null
        })
      );
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [resolveInput]);

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
      if (!isFocused) {
        return;
      }
      const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
      if (data?.tab === 'summary') {
        // Freeze selection only if Summary was focused; otherwise do not steal focus.
        freezeSelectionForDrag();
      }
    },
    [freezeSelectionForDrag, isFocused]
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
    if (isFocused) {
      t = window.setTimeout(() => {
        setAutosaveTick(v => v + 1);
      }, SUMMARY_AUTOSAVE_MS);
    }
    return () => {
      if (t !== undefined) {
        window.clearTimeout(t);
      }
    };
  }, [isFocused, value]);

  const onFocus = useCallback(() => {
    onFocused?.();
    setIsFocused(true);
  }, [onFocused]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLTextAreaElement | HTMLInputElement).blur();
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

  const onSelect = useCallback((e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    inputRef.current = el;
    captureSelection(el);
  }, [captureSelection]);

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
    <div ref={containerRef} className="relative w-full">
      <FieldDropzone isOver={isOver} setNodeRef={setNodeRef} className="w-full p-1">
        <div className="relative flex w-full items-center rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-pink-400/60">
          {selectedText.trim() ? (
            <div className="absolute right-2 top-2 z-10">
              <TwButton
                size="xs"
                variant="secondary"
                className="shadow-sm active:translate-y-px active:shadow-none"
                onPointerDown={onSaveSelectionPointerDown}
                onClick={onSaveSelectionClick}
                disabled={!onSaveSelection}
                title="Save selected text to Saved Blocks"
              >
                Save selection
              </TwButton>
            </div>
          ) : null}

          <textarea
            ref={node => {
              inputRef.current = node;
            }}
            rows={1}
            value={value}
            placeholder={placeholder}
            onChange={onChange}
            onPaste={onPaste}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            onSelect={onSelect}
            onKeyUp={onSelect}
            onMouseUp={onSelect}
            className="block flex-1 resize-none border-0 bg-transparent p-0 text-[20px] font-semibold leading-7 outline-none focus:ring-0"
          />

          {/* prevents TS “unused state” while still making autosave observable in React DevTools */}
          <span className="hidden" aria-hidden>
            {autosaveTick ? '' : ''}
          </span>
        </div>
      </FieldDropzone>
    </div>
  );
};
