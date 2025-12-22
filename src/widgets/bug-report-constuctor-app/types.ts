export interface SavedBlocks {
  /** Reusable blocks for Summary tab (used for drag/drop and click-to-insert). */
  summary: string[];
  /** Reusable blocks for Preconditions tab. */
  preconditions: string[];
  /** Reusable blocks for Steps tab. */
  steps: string[];
}

/** Legacy format kept for backward compatibility with already-saved user data. */
export interface LegacySavedBlocks {
  summaryChunks: string[];
  preconditions: string;
  steps: string[];
  additionalInfo: string;
}
