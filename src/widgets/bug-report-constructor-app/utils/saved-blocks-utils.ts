import type {SavedBlocks} from '../types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function isSavedBlocks(value: unknown): value is SavedBlocks {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.summary) && Array.isArray(value.preconditions) && Array.isArray(value.steps);
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeBlocks(value: SavedBlocks): SavedBlocks {
  return {
    summary: arrayOrEmpty(value.summary),
    preconditions: arrayOrEmpty(value.preconditions),
    steps: arrayOrEmpty(value.steps)
  };
}

export function normalizeSavedBlocks(value: unknown): SavedBlocks {
  if (isSavedBlocks(value)) {
    return normalizeBlocks(value);
  }

  return {summary: [], preconditions: [], steps: []};
}
