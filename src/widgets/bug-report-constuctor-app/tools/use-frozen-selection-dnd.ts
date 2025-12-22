import {useCallback, useEffect, useRef} from 'react';

import {getSelectionFromElement} from './text-insert.ts';

export type TextSelectionRange = {start: number; end: number};

export type UseFrozenSelectionDndOptions<T extends HTMLInputElement | HTMLTextAreaElement> = {
  /**
   * Must return the currently relevant text input element.
   * Can include fallbacks (e.g. from document.activeElement) as needed.
   */
  resolveElement: () => T | null;

  /** Attach selectionchange listener while true. */
  selectionTrackingEnabled: boolean;
};

export function useFrozenSelectionDnd<T extends HTMLInputElement | HTMLTextAreaElement>({
  resolveElement,
  selectionTrackingEnabled
}: UseFrozenSelectionDndOptions<T>) {
  const selectionRef = useRef<TextSelectionRange>({start: 0, end: 0});

  const draggingRef = useRef(false);
  const dragSelectionRef = useRef<TextSelectionRange | null>(null);
  const dragWasFocusedRef = useRef(false);

  const captureSelection = useCallback((el: T | null) => {
    if (!el) {
      return;
    }
    selectionRef.current = {
      start: el.selectionStart ?? el.value.length,
      end: el.selectionEnd ?? el.value.length
    };
  }, []);

  const resetDragState = useCallback(() => {
    draggingRef.current = false;
    dragSelectionRef.current = null;
    dragWasFocusedRef.current = false;
  }, []);

  const restoreFrozenSelection = useCallback(() => {
    const el = resolveElement();
    const frozen = dragSelectionRef.current;
    if (!el || !frozen) {
      return;
    }

    // Do not steal focus: only restore selection if the field was focused when the drag started.
    if (!dragWasFocusedRef.current) {
      return;
    }

    // If the field was focused at drag start, keep it focused to preserve caret visibility.
    el.focus?.();
    const {start, end} = getSelectionFromElement(el, frozen);
    el.setSelectionRange?.(start, end);
    selectionRef.current = {start, end};
  }, [resolveElement]);

  const freezeSelectionForDrag = useCallback(() => {
    const el = resolveElement();
    if (!el) {
      dragWasFocusedRef.current = false;
      return false;
    }

    const isFocused = document.activeElement === el;
    dragWasFocusedRef.current = isFocused;
    if (!isFocused) {
      return false;
    }

    draggingRef.current = true;
    // Read selection from the element at drag start.
    // Relying only on selectionRef can be stale if caret moved without firing selectionchange.
    const selectionAtDragStart = getSelectionFromElement(el, selectionRef.current);
    dragSelectionRef.current = selectionAtDragStart;
    selectionRef.current = selectionAtDragStart;

    // Ensure caret remains visible during DnD.
    requestAnimationFrame(() => {
      const current = resolveElement();
      if (!current) {
        return;
      }
      current.focus?.();
      const frozen = dragSelectionRef.current ?? selectionRef.current;
      const start = Math.max(0, Math.min(current.value.length, frozen.start));
      const end = Math.max(0, Math.min(current.value.length, frozen.end));
      current.setSelectionRange?.(start, end);
    });

    return true;
  }, [resolveElement]);

  useEffect(() => {
    if (!selectionTrackingEnabled) {
      return () => {
        // no-op
      };
    }

    const onSelectionChange = () => {
      const el = resolveElement();
      if (!el) {
        return;
      }
      if (document.activeElement !== el) {
        return;
      }
      // While dragging, keep tracking the latest caret/selection for the focused field.
      // This allows dropping to insert at the caret position at drop time.
      if (draggingRef.current) {
        const next = {
          start: el.selectionStart ?? el.value.length,
          end: el.selectionEnd ?? el.value.length
        };
        dragSelectionRef.current = next;
        selectionRef.current = next;
        return;
      }

      captureSelection(el);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [captureSelection, resolveElement, selectionTrackingEnabled]);

  return {
    selectionRef,
    draggingRef,
    dragWasFocusedRef,
    captureSelection,
    freezeSelectionForDrag,
    restoreFrozenSelection,
    resetDragState
  };
}
