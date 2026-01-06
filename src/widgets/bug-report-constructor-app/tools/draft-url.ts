export type DraftUrlCustomField = {
  key: string;
  value?: string;
};

export type BuildDraftIssueUrlParams = {
  baseUrl: string;
  projectShortName: string;
  summary?: string;
  description?: string;
  customFields?: DraftUrlCustomField[];
};

export function buildDraftIssueUrl(params: BuildDraftIssueUrlParams): string {
  const {baseUrl, projectShortName, summary, description, customFields} = params;

  const searchParams = new URLSearchParams();
  searchParams.set('project', projectShortName);

  const trimmedSummary = summary?.trim() ?? '';
  if (trimmedSummary) {
    searchParams.set('summary', trimmedSummary);
  }

  const trimmedDescription = description?.trim() ?? '';
  if (trimmedDescription) {
    searchParams.set('description', trimmedDescription);
  }

  for (const field of customFields ?? []) {
    const key = field.key.trim();
    if (!key) {
      continue;
    }
    const value = field.value?.trim() ?? '';
    const payload = value ? `${key} ${value}` : key;
    searchParams.append('c', payload);
  }

  // Prefer WHATWG URL for absolute bases. If baseUrl is empty/relative/invalid,
  // fall back to a relative URL which still works for navigation.
  try {
    const url = new URL('newIssue', baseUrl);
    url.search = searchParams.toString();
    return url.toString();
  } catch {
    const normalizedBase = (baseUrl ?? '').trim();
    const prefix = normalizedBase
      ? normalizedBase.endsWith('/') || normalizedBase.endsWith('newIssue')
        ? normalizedBase
        : `${normalizedBase}/`
      : '';
    const qs = searchParams.toString();
    return qs ? `${prefix}newIssue?${qs}` : `${prefix}newIssue`;
  }
}
