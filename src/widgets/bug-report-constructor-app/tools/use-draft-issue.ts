import {useEffect, useRef, useState} from 'react';

import type {API} from '../api.ts';

function resolveDraftAction(params: {
  draftIssueId: string | null;
  previousProjectId: string | null;
  selectedProjectId: string;
}): {kind: 'create'} | {kind: 'update'} | {kind: 'noop'} {
  const {draftIssueId, previousProjectId, selectedProjectId} = params;

  if (!draftIssueId) {
    return {kind: 'create'};
  }

  if (previousProjectId !== selectedProjectId) {
    return {kind: 'update'};
  }

  return {kind: 'noop'};
}

export function useDraftIssue(
  api: API | null,
  selectedProjectId: string
): {draftIssueId: string | null; loading: boolean; error: string | null; revision: number} {
  const [draftIssueId, setDraftIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const draftProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!api || !selectedProjectId) {
      setDraftIssueId(null);
      setError(null);
      setLoading(false);
      draftProjectIdRef.current = null;
      return () => {
        // no-op
      };
    }

    let disposed = false;
    setError(null);

    const action = resolveDraftAction({
      draftIssueId,
      previousProjectId: draftProjectIdRef.current,
      selectedProjectId
    });

    if (action.kind === 'noop') {
      setLoading(false);
      return () => {
        disposed = true;
      };
    }

    setLoading(true);
    const request =
      action.kind === 'create'
        ? api.createDraft(selectedProjectId)
        : api.setProjectToDraft(draftIssueId!, selectedProjectId);

    request
      .then(result => {
        if (disposed) {
          return;
        }
        if (action.kind === 'create') {
          setDraftIssueId(result.id);
        }
        draftProjectIdRef.current = selectedProjectId;
        setRevision(prev => prev + 1);
      })
      .catch(e => {
        const msg = e instanceof Error ? e.message : String(e);
        if (disposed) {
          return;
        }
        setError(msg);
        setDraftIssueId(null);
        draftProjectIdRef.current = null;
        setRevision(prev => prev + 1);
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [api, draftIssueId, selectedProjectId]);

  return {draftIssueId, loading, error, revision};
}
