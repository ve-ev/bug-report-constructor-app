import {useEffect, useState} from 'react';

import type {API} from '../api.ts';
import type {ProjectCustomField} from '../types.ts';

export function useProjectCustomFields(
  api: API | null,
  projectId: string
): {fields: ProjectCustomField[]; loading: boolean; error: string | null} {
  const [fields, setFields] = useState<ProjectCustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !projectId) {
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
        const loaded = await api.getProjectCustomFields(projectId);
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
  }, [api, projectId]);

  return {fields, loading, error};
}
