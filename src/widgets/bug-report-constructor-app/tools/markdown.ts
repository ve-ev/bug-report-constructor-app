import {BugReportDraft} from "../types.ts";

export type OutputFormat = string;

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

function pushTemplateBullets(lines: string[], title: string, items: string[]): void {
  pushH2(lines, title);
  if (items.length) {
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push('-');
  }
  lines.push('');
}

export function buildBugReportDescription(
  draft: BugReportDraft,
  format: OutputFormat,
  opts?: {
    /** Custom templates keyed by format id. */
    templatesById?: Record<string, string>;
  }
): string {
  const preconditions = normalizeLines(draft.preconditions);
  const steps = normalizeLines(draft.steps);
  const summary = draft.summary.trim();

  const lines: string[] = [];

  if (format === 'markdown_default') {
    buildIssueTemplateDescriptionLines(lines, {draft, preconditions, steps, summary});
  } else {
    buildCustomDescriptionLines(lines, {draft, preconditions, steps, format, opts});
  }

  // Avoid trailing whitespace, keep a single trailing newline.
  return `${lines.join('\n').trimEnd()}\n`;
}

function buildIssueTemplateDescriptionLines(
  lines: string[],
  params: {
    draft: BugReportDraft;
    preconditions: string[];
    steps: string[];
    summary: string;
  }
): void {
  const {draft, preconditions, steps} = params;
  // Template requested in the issue description.
  pushTemplateBullets(lines, 'Prerequisites', preconditions);
  pushTemplateNumbered(lines, 'Steps to reproduce:', steps);
  pushTemplateText(lines, 'Expected results:', draft.expected);
  pushTemplateText(lines, 'Current results:', draft.actual);
  pushTemplateText(lines, 'Additional information:', draft.additionalInfo);
}

function buildCustomDescriptionLines(
  lines: string[],
  params: {
    draft: BugReportDraft;
    preconditions: string[];
    steps: string[];
    format: OutputFormat;
    opts?: {templatesById?: Record<string, string>};
  }
): void {
  const {draft, preconditions, steps, format, opts} = params;
  // Custom user-defined template.
  const template = opts?.templatesById?.[format] ?? '';
  const rendered = renderCustomTemplate(draft, {template});

  // If something goes wrong, fall back to default markdown.
  if (rendered.trim()) {
    lines.push(rendered.trim(), '');
    return;
  }

  // Keep behavior consistent: custom templates do not inject Summary automatically.
  pushBulletsSection(lines, 'Prerequisites', preconditions);
  pushNumberedSection(lines, 'Steps', steps);
  pushTextSection(lines, 'Expected', draft.expected);
  pushTextSection(lines, 'Actual', draft.actual);
  pushTextSection(lines, 'Additional info', draft.additionalInfo);
}

export function renderCustomTemplate(
  draft: BugReportDraft,
  opts: {
    template: string;
  }
): string {
  const preconditions = normalizeLines(draft.preconditions);
  const steps = normalizeLines(draft.steps);
  const attachments = normalizeLines(draft.attachments.map(a => a.name));

  const vars: Record<string, string> = {
    summary: draft.summary.trim(),
    preconditions: preconditions.join('\n'),
    'preconditions_bullets': preconditions.length ? preconditions.map(x => `- ${x}`).join('\n') : '-',
    steps: steps.join('\n'),
    'steps_numbered': steps.length ? steps.map((x, i) => `${i + 1}. ${x}`).join('\n') : '1.',
    expected: draft.expected.trim(),
    actual: draft.actual.trim(),
    additionalInfo: draft.additionalInfo.trim(),
    'attachments_bullets': attachments.length ? attachments.map(x => `- ${x}`).join('\n') : '-'
  };

  const template = opts.template ?? '';
  if (!template.trim()) {
    return '';
  }

  // Simple placeholder substitution: {{varName}}.
  // Unknown placeholders are replaced with an empty string.
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : '';
  });
}
