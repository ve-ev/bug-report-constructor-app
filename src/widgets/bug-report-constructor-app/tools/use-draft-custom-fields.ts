import {useEffect, useState} from 'react';

import type {API} from '../api.ts';
import {CustomField} from '../types.ts';

export function useDraftCustomFields(
  api: API | null,
  draftIssueId: string | null,
  reloadKey: number
): {fields: CustomField[]; loading: boolean; error: string | null} {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !draftIssueId) {
      setFields([]);
      setError(null);
      setLoading(false);
      return () => {
        // no-op
      };
    }

    let disposed = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const loaded = await api.getDraftCustomFields(draftIssueId);
        if (disposed) {
          return;
        }
        setFields(loaded);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (disposed) {
          return;
        }
        setError(msg);
        setFields([]);
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [api, draftIssueId, reloadKey]);

  return {fields, loading, error};
}
