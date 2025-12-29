export type AdaptiveFieldKey =
  | 'summary'
  | 'preconditions'
  | 'steps'
  | 'expected'
  | 'actual'
  | 'additionalInfo';

export type AdaptiveFieldConfig = {
  visible: boolean;
  label: string;
};

const DEFAULT_LABELS: Record<AdaptiveFieldKey, string> = {
  summary: 'Summary',
  preconditions: 'Prerequisites',
  steps: 'Steps to reproduce:',
  expected: 'Expected results:',
  actual: 'Current results:',
  additionalInfo: 'Additional information:'
};

const FALLBACK_CUSTOM_LABELS: Record<AdaptiveFieldKey, string> = {
  summary: 'Summary',
  preconditions: 'Prerequisites',
  steps: 'Steps',
  expected: 'Expected',
  actual: 'Actual',
  additionalInfo: 'Additional info'
};

const PLACEHOLDER_GROUPS: Record<AdaptiveFieldKey, string[]> = {
  summary: ['summary'],
  preconditions: ['preconditions', 'preconditions_bullets'],
  steps: ['steps', 'steps_numbered'],
  expected: ['expected'],
  actual: ['actual'],
  additionalInfo: ['additionalInfo']
};

const HEADER_TITLE_GROUP_INDEX = 2;

function buildConfigAllVisible(labels: Record<AdaptiveFieldKey, string>): Record<AdaptiveFieldKey, AdaptiveFieldConfig> {
  return {
    summary: {visible: true, label: labels.summary},
    preconditions: {visible: true, label: labels.preconditions},
    steps: {visible: true, label: labels.steps},
    expected: {visible: true, label: labels.expected},
    actual: {visible: true, label: labels.actual},
    additionalInfo: {visible: true, label: labels.additionalInfo}
  };
}

// eslint-disable-next-line complexity
function buildConfigFromTemplate(template: string): Record<AdaptiveFieldKey, AdaptiveFieldConfig> {
  const placeholders = extractPlaceholders(template);
  const placeholderSet = new Set(placeholders);

  const labelByKey: Partial<Record<AdaptiveFieldKey, string>> = {};
  const lines = template.split(/\r?\n/);
  let currentHeader: string | null = null;

  for (const line of lines) {
    const header = extractHeaderTitle(line);
    if (header) {
      currentHeader = header;
      continue;
    }

    // If the line has placeholders, tie them to the most recent header.
    if (!currentHeader) {
      continue;
    }

    for (const key of Object.keys(PLACEHOLDER_GROUPS) as AdaptiveFieldKey[]) {
      if (labelByKey[key]) {
        continue;
      }
      const group = PLACEHOLDER_GROUPS[key];
      if (group.some(ph => line.includes(`{{${ph}}}`) || line.includes(`{{ ${ph} }}`))) {
        labelByKey[key] = currentHeader;
      }
    }
  }

  const cfg = {} as Record<AdaptiveFieldKey, AdaptiveFieldConfig>;
  for (const key of Object.keys(PLACEHOLDER_GROUPS) as AdaptiveFieldKey[]) {
    const group = PLACEHOLDER_GROUPS[key];
    const visible = key === 'summary' ? true : group.some(ph => placeholderSet.has(ph));
    cfg[key] = {
      visible,
      label: (labelByKey[key] ?? FALLBACK_CUSTOM_LABELS[key]).trim()
    };
  }

  return cfg;
}

function extractHeaderTitle(line: string): string | null {
  // Accept markdown ATX headings: # Title, ## Title, ...
  const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
  if (!m) {
    return null;
  }
  // Keep punctuation as-is (e.g., "Steps to reproduce:")
  const raw = m[HEADER_TITLE_GROUP_INDEX].trim();
  if (!raw) {
    return null;
  }
  // Trim trailing hashes if user wrote "## Title ##"
  return raw.replace(/\s+#+\s*$/, '').trim();
}

function extractPlaceholders(template: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    out.push(m[1]);
  }
  return out;
}

export function computeAdaptiveFields(opts: {
  format: string;
  template?: string;
}): Record<AdaptiveFieldKey, AdaptiveFieldConfig> {
  const {format} = opts;

  if (format === 'markdown_default') {
    return buildConfigAllVisible(DEFAULT_LABELS);
  }

  const template = opts.template ?? '';
  const hasTemplate = Boolean(template.trim());

  // No custom template: keep the UI usable and consistent with markdown.ts fallback.
  if (!hasTemplate) {
    return buildConfigAllVisible(FALLBACK_CUSTOM_LABELS);
  }

  return buildConfigFromTemplate(template);
}
