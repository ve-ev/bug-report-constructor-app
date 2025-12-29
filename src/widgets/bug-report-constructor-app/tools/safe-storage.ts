function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    // In some environments (e.g., sandboxed iframes without allow-same-origin),
    // accessing `window.localStorage` throws a SecurityError.
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, value);
  } catch {
    // no-op
  }
}
