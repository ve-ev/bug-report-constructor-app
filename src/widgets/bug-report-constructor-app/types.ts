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

export type ViewMode = 'wide' | 'fixed';

export type ColorScheme = 'blue' | 'magenta';

export type UiPreferences = {
  viewMode: ViewMode;
  colorScheme: ColorScheme;
};

// YouTrack entities

export interface Project{
  id: string;
  name: string;
  shortName: string;
}

export interface SelectedCustomField {
  /** `CustomField.id` */
  id: string;
  /**
   * User-provided value (free-text) or the selected possible value name.
   * This is what gets serialized into the draft URL.
   */
  value: string;

  /** Selected possible value id (for enum/user/build/state etc). */
  valueId?: string;
}

export interface CustomField {
  id: string;
  name: string;

  /** YouTrack entity type (e.g. `SingleEnumIssueCustomField`). */
  type?: string;
}

export interface CustomFieldPossibleValue {
  id: string;
  name: string;
  description: string;
}

export interface DraftIssue {
  id: string;
}
