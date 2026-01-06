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

function setIfTrimmedNotEmpty(searchParams: URLSearchParams, key: string, value: string | undefined): void {
  const trimmed = value?.trim() ?? '';
  if (trimmed) {
    searchParams.set(key, trimmed);
  }
}

function appendCustomFields(searchParams: URLSearchParams, customFields: DraftUrlCustomField[] | undefined): void {
  for (const field of customFields ?? []) {
    const key = field.key.trim();
    if (!key) {
      continue;
    }

    const value = field.value?.trim() ?? '';
    searchParams.append('c', value ? `${key} ${value}` : key);
  }
}

function tryBuildAbsoluteUrl(baseUrl: string, searchParams: URLSearchParams): string | null {
  try {
    const url = new URL('newIssue', baseUrl);
    url.search = searchParams.toString();
    return url.toString();
  } catch {
    return null;
  }
}

function buildRelativeUrl(baseUrl: string, searchParams: URLSearchParams): string {
  const normalizedBase = (baseUrl ?? '').trim();
  let prefix = '';

  if (normalizedBase) {
    if (normalizedBase.endsWith('/') || normalizedBase.endsWith('newIssue')) {
      prefix = normalizedBase;
    } else {
      prefix = `${normalizedBase}/`;
    }
  }

  const qs = searchParams.toString();
  return qs ? `${prefix}newIssue?${qs}` : `${prefix}newIssue`;
}

export function buildDraftIssueUrl(params: BuildDraftIssueUrlParams): string {
  const {baseUrl, projectShortName, summary, description, customFields} = params;

  const searchParams = new URLSearchParams();
  searchParams.set('project', projectShortName);

  setIfTrimmedNotEmpty(searchParams, 'summary', summary);
  setIfTrimmedNotEmpty(searchParams, 'description', description);
  appendCustomFields(searchParams, customFields);

  // Prefer WHATWG URL for absolute bases. If baseUrl is empty/relative/invalid,
  // fall back to a relative URL which still works for navigation.
  return tryBuildAbsoluteUrl(baseUrl, searchParams) ?? buildRelativeUrl(baseUrl, searchParams);
}
