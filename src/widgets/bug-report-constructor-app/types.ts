// App entities

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
  /** Template string with placeholders like {{steps_numbered}}. */
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

// YouTrack entities

export interface Project{
  id: string;
  name: string;
  shortName: string;
}

export interface SelectedCustomField {
  /** `CustomField.id` */
  id: string;
  value: string;
}

export interface CustomField {
  id: string;
  name: string;
}

export interface Issue {
  id: string;
  summary: string;
  project: Project;
  customFields: SelectedCustomField[];
}

export interface DraftIssue {
  id: string;
}
