export interface BugReportDraft {
  summary: string;
  preconditions: string[];
  steps: string[];
  expected: string;
  actual: string;
  additionalInfo: string;
  attachments: {name: string}[];
}

export type OutputFormat = 'markdown_default' | 'markdown_issue_template';

function normalizeLines(list: string[]): string[] {
  return list.map(s => s.trim()).filter(Boolean);
}

function pushHeading(lines: string[], title: string): void {
  lines.push(`### ${title}`);
}

function pushTextSection(lines: string[], title: string, text: string): void {
  pushHeading(lines, title);
  lines.push(text.trim() || '-');
  lines.push('');
}

function pushBulletsSection(lines: string[], title: string, items: string[]): void {
  pushHeading(lines, title);
  if (items.length) {
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push('-');
  }
  lines.push('');
}

function pushNumberedSection(lines: string[], title: string, items: string[]): void {
  pushHeading(lines, title);
  if (items.length) {
    for (let i = 0; i < items.length; i++) {
      lines.push(`${i + 1}. ${items[i]}`);
    }
  } else {
    lines.push('1.');
  }
  lines.push('');
}

export function buildBugReportMarkdown(draft: BugReportDraft): string {
  return buildBugReportDescription(draft, 'markdown_default');
}

function pushH2(lines: string[], title: string): void {
  lines.push(`## ${title}`);
}

function pushTemplateText(lines: string[], title: string, text: string): void {
  pushH2(lines, title);
  const value = text.trim();
  if (value) {
    lines.push(value);
  }
  lines.push('');
}

function pushTemplateLines(lines: string[], title: string, items: string[]): void {
  pushH2(lines, title);
  if (items.length) {
    lines.push(...items);
  }
  lines.push('');
}

function pushTemplateNumbered(lines: string[], title: string, items: string[]): void {
  pushH2(lines, title);
  if (items.length) {
    for (let i = 0; i < items.length; i++) {
      lines.push(`${i + 1}. ${items[i]}`);
    }
  } else {
    lines.push('1.');
  }
  lines.push('');
}

export function buildBugReportDescription(draft: BugReportDraft, format: OutputFormat): string {
  const preconditions = normalizeLines(draft.preconditions);
  const steps = normalizeLines(draft.steps);

  const lines: string[] = [];

  const summary = draft.summary.trim();
  if (summary) {
    lines.push(summary, '');
  }

  if (format === 'markdown_issue_template') {
    // Template requested in the issue description.
    pushTemplateLines(lines, 'Prerequisites', preconditions);
    pushTemplateNumbered(lines, 'Steps to reproduce:', steps);
    pushTemplateText(lines, 'Expected results:', draft.expected);
    pushTemplateText(lines, 'Current results:', draft.actual);
    pushTemplateText(lines, 'Additional information:', draft.additionalInfo);
  } else {
    pushBulletsSection(lines, 'Prerequisites', preconditions);
    pushNumberedSection(lines, 'Steps', steps);
    pushTextSection(lines, 'Expected', draft.expected);
    pushTextSection(lines, 'Actual', draft.actual);
    pushTextSection(lines, 'Additional info', draft.additionalInfo);

    if (draft.attachments.length) {
      pushBulletsSection(
        lines,
        'Attachments',
        draft.attachments.map(a => a.name)
      );
    }
  }

  // Avoid trailing whitespace, keep a single trailing newline.
  return `${lines.join('\n').trimEnd()}\n`;
}
