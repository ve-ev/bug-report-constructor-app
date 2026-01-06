import {useEffect, useState} from 'react';

import type {API} from '../api.ts';
import type {Project} from '../types.ts';

export function useUserProjects(api: API | null): {projects: Project[]; loading: boolean; error: string | null} {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api) {
      return () => {
        // no-op
      };
    }

    let disposed = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const loaded = await api.getUserProjects();
        if (disposed) {
          return;
        }
        setProjects(loaded);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (disposed) {
          return;
        }
        setError(msg);
        setProjects([]);
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [api]);

  return {projects, loading, error};
}
