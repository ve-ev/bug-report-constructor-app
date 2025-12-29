function normalizeSingleLine(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').trim();
}

export const SUMMARY_DROP_ID = 'issue-drop-summary';

export function appendSummaryChunk(prev: string, text: string): string {
  const chunk = normalizeSingleLine(text);
  if (!chunk) {
    return prev;
  }
  const base = prev.trim();
  return base ? `${base} ${chunk}` : chunk;
}

export function normalizeSummaryInsert(text: string): string {
  return normalizeSingleLine(text);
}
