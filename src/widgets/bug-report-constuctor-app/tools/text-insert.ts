export type TextSelection = {start: number; end: number};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function getSelectionFromElement(
  el: HTMLInputElement | HTMLTextAreaElement,
  fallback: TextSelection
): TextSelection {
  const len = el.value.length;
  const rawStart = el.selectionStart ?? fallback.start;
  const rawEnd = el.selectionEnd ?? fallback.end;
  return {
    start: clamp(rawStart, 0, len),
    end: clamp(rawEnd, 0, len)
  };
}

export function insertTextAtSelection(
  currentValue: string,
  selection: TextSelection,
  insert: string
): {next: string; caret: number} {
  const before = currentValue.slice(0, selection.start);
  const after = currentValue.slice(selection.end);
  const next = `${before}${insert}${after}`;
  return {next, caret: selection.start + insert.length};
}
