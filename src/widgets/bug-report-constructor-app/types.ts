export interface SavedBlocks {
  /** Reusable blocks for Summary tab (used for drag/drop and click-to-insert). */
  summary: string[];
  /** Reusable blocks for Preconditions tab. */
  preconditions: string[];
  /** Reusable blocks for Steps tab. */
  steps: string[];
}

export interface CustomOutputFormat {
  /** Stable identifier used as select value and for persistence. */
  id: string;
  /** User-visible name. */
  name: string;
  /** Template string with placeholders like {{summary}}. */
  template: string;
}

export interface OutputFormatsPayload {
  /** Currently selected output format (built-in id or custom id). */
  activeFormat: string;
  /** User-defined formats. */
  formats: CustomOutputFormat[];
}

export interface BugReportDraft {
  summary: string;
  preconditions: string[];
  steps: string[];
  expected: string;
  actual: string;
  additionalInfo: string;
  attachments: {name: string}[];
}
