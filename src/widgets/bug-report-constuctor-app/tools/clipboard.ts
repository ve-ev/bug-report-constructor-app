export type CopyResult = 'copied' | 'manual' | 'failed';

function hasNavigatorClipboard(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
}

function isLikelyClipboardApiAllowed(): boolean | undefined {
  // `navigator.clipboard.writeText()` is often blocked in embedded/sandboxed contexts by
  // Permissions Policy. Also, it generally requires a secure context.
  return typeof window !== 'undefined' && (window as unknown as { isSecureContext?: boolean }).isSecureContext;
}

function createHiddenTextarea(text: string): HTMLTextAreaElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const el = document.createElement('textarea');
  el.value = text;

  // Keep element unobtrusive but selectable.
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';

  document.body.appendChild(el);
  return el;
}

function captureActiveRange(): Range | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const selection = document.getSelection?.();
  return selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
}

function restoreActiveRange(range: Range | null): void {
  if (!range || typeof document === 'undefined') {
    return;
  }

  try {
    const selection = document.getSelection?.();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    // ignore
  }
}

function execCopy(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  try {
    return document.execCommand?.('copy') ?? false;
  } catch {
    return false;
  }
}

function tryExecCommandCopy(text: string): boolean {
  const el = createHiddenTextarea(text);
  if (!el) {
    return false;
  }

  const prevRange = captureActiveRange();

  el.focus();
  el.select();
  el.setSelectionRange(0, el.value.length);

  const ok = execCopy();

  document.body.removeChild(el);
  restoreActiveRange(prevRange);

  return ok;
}

export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (!text) {
    return 'failed';
  }

  // Prefer legacy copy first: it avoids Permissions Policy violations in many embedded contexts.
  if (tryExecCommandCopy(text)) {
    return 'copied';
  }

  // Clipboard API is more reliable in modern browsers, but it may be blocked by Permissions Policy.
  if (hasNavigatorClipboard() && isLikelyClipboardApiAllowed()) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // fall through to manual copy
    }
  }

  return 'manual';
}
