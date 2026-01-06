import {useEffect} from 'react';

export function useAutoClearMessage(
  value: string | null,
  onClear: () => void,
  timeoutMs: number
): void {
  useEffect(() => {
    if (!value) {
      return () => {
        // no-op
      };
    }
    const t = window.setTimeout(() => {
      onClear();
    }, timeoutMs);
    return () => {
      window.clearTimeout(t);
    };
  }, [onClear, timeoutMs, value]);
}
