import type {LegacySavedBlocks, SavedBlocks} from './types.ts';

export function isSavedBlocksV2(value: unknown): value is SavedBlocks {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as SavedBlocks).summary) &&
    Array.isArray((value as SavedBlocks).preconditions) &&
    Array.isArray((value as SavedBlocks).steps)
  );
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function stringOrEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

function normalizeBlocksV2(value: SavedBlocks): SavedBlocks {
  return {
    summary: arrayOrEmpty(value.summary),
    preconditions: arrayOrEmpty(value.preconditions),
    steps: arrayOrEmpty(value.steps)
  };
}

function normalizeBlocksLegacy(value: LegacySavedBlocks | null | undefined): SavedBlocks {
  const summary = arrayOrEmpty(value?.summaryChunks);
  const preconditionsValue = stringOrEmpty(value?.preconditions).trim();
  const preconditions = preconditionsValue ? [preconditionsValue] : [];
  const steps = arrayOrEmpty(value?.steps);
  return {summary, preconditions, steps};
}

export function normalizeSavedBlocks(value: SavedBlocks | LegacySavedBlocks | null | undefined): SavedBlocks {
  return isSavedBlocksV2(value)
    ? normalizeBlocksV2(value)
    : normalizeBlocksLegacy(value as LegacySavedBlocks | null | undefined);
}
