import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {API} from '../api.ts';
import {useUserProjects} from '../tools/use-user-projects.ts';
import {useDraftIssue} from '../tools/use-draft-issue.ts';
import type {TopPanelProps} from '../components/top-panel.tsx';
import type {BottomPanelProps} from '../components/bottom-panel.tsx';
import {buildDraftIssueUrl, type DraftUrlCustomField} from '../tools/draft-url.ts';
import {safeGetItem, safeSetItem} from '../tools/safe-storage.ts';
import type {ViewMode} from '../types.ts';
import {ConstructorStoreContext, type ConstructorStore} from './constructor-store-context.ts';

const RESET_CLICKS_TO_UNLOCK_PLAYGROUND = 20;
const VIEW_MODE_STORAGE_KEY = 'brc:viewMode';
const DEFAULT_VIEW_MODE: ViewMode = 'wide';

export const ConstructorStoreProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [api, setApi] = useState<API | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = safeGetItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'fixed' || stored === 'wide' ? stored : DEFAULT_VIEW_MODE;
  });

  const setViewMode = useCallback((next: ViewMode) => {
    setViewModeState(next);
  }, []);

  useEffect(() => {
    safeSetItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const draftUrlDataRef = useRef<{summary: string; description: string; customFields: DraftUrlCustomField[]}>(
    {summary: '', description: '', customFields: []}
  );

  const setDraftUrlData = useCallback(
    (data: {summary: string; description: string; customFields: DraftUrlCustomField[]}) => {
      draftUrlDataRef.current = data;
    },
    []
  );

  const apiRef = useRef<API | null>(null);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const {projects, loading: projectsLoading, error: projectsError} = useUserProjects(api);

  const {
    draftIssueId,
    loading: draftLoading,
    error: draftError,
    revision: draftRevision
  } = useDraftIssue(api, selectedProjectId);

  const draftIssueIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIssueIdRef.current = draftIssueId;
  }, [draftIssueId]);

  const cleanupDraft = useCallback(() => {
    const id = draftIssueIdRef.current;
    const apiInstance = apiRef.current;
    if (!apiInstance || !id) {
      return;
    }
    // Ensure cleanup happens at most once per draft id.
    draftIssueIdRef.current = null;
    apiInstance.deleteDraft(id).catch(() => {
      // best-effort
    });
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', cleanupDraft);
    window.addEventListener('pagehide', cleanupDraft);
    window.addEventListener('popstate', cleanupDraft);
    window.addEventListener('hashchange', cleanupDraft);

    const historyApi = window.history;
    const origPushState = historyApi?.pushState?.bind(historyApi);
    const origReplaceState = historyApi?.replaceState?.bind(historyApi);

    if (origPushState) {
      historyApi.pushState = (...args: Parameters<History['pushState']>) => {
        cleanupDraft();
        return origPushState(...args);
      };
    }

    if (origReplaceState) {
      historyApi.replaceState = (...args: Parameters<History['replaceState']>) => {
        cleanupDraft();
        return origReplaceState(...args);
      };
    }

    return () => {
      window.removeEventListener('beforeunload', cleanupDraft);
      window.removeEventListener('pagehide', cleanupDraft);
      window.removeEventListener('popstate', cleanupDraft);
      window.removeEventListener('hashchange', cleanupDraft);

      if (origPushState) {
        historyApi.pushState = origPushState;
      }
      if (origReplaceState) {
        historyApi.replaceState = origReplaceState;
      }

      cleanupDraft();
    };
  }, [cleanupDraft]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const host = await YTApp.register({
        onRefresh: () => {
          cleanupDraft();
        }
      });
      if (disposed) {
        return;
      }
      setApi(new API(host));
    })();
    return () => {
      disposed = true;
    };
  }, [cleanupDraft]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) {
      return null;
    }
    return projects.find(p => p.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const onCreateDraft = useCallback(() => {
    const apiInstance = apiRef.current;
    if (!apiInstance || !selectedProject) {
      return;
    }
    cleanupDraft();
    const baseUrl = apiInstance.getBaseUrl();
    const {summary, description, customFields} = draftUrlDataRef.current;
    const url = buildDraftIssueUrl({
      baseUrl,
      projectShortName: selectedProject.shortName,
      summary,
      description,
      customFields
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [cleanupDraft, selectedProject]);

  const createDraftDisabled = !api || !selectedProjectId;

  const projectSelectDisabled = !api || projectsLoading || draftLoading;

  const [showPlayground, setShowPlayground] = useState(false);
  const [playgroundUnlocked, setPlaygroundUnlocked] = useState(false);
  const [, setResetClicksInRow] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const openPlayground = useCallback(() => {
    setShowPlayground(true);
  }, []);

  const closePlayground = useCallback(() => {
    setShowPlayground(false);
  }, []);

  const triggerReset = useCallback(() => {
    setResetSignal(prev => prev + 1);
    setResetClicksInRow(prev => {
      const next = prev + 1;
      if (next >= RESET_CLICKS_TO_UNLOCK_PLAYGROUND) {
        setPlaygroundUnlocked(true);
        return RESET_CLICKS_TO_UNLOCK_PLAYGROUND;
      }
      return next;
    });
  }, []);

  const topPanelProps = useMemo<TopPanelProps>(
    () => ({
      onResetForm: triggerReset,
      onOpenPlayground: playgroundUnlocked ? openPlayground : undefined,
      viewMode,
      onViewModeChange: setViewMode,
      projectSelectDisabled,
      selectedProjectId,
      projects,
      projectsLoading,
      onSelectedProjectIdChange: setSelectedProjectId,
      projectsError
    }),
    [
      openPlayground,
      playgroundUnlocked,
      setViewMode,
      viewMode,
      projectSelectDisabled,
      projects,
      projectsError,
      projectsLoading,
      selectedProjectId,
      triggerReset
    ]
  );

  const bottomPanelProps = useMemo<BottomPanelProps>(
    () => ({
      viewMode,
      createDraftDisabled,
      onCreateDraft
    }),
    [createDraftDisabled, onCreateDraft, viewMode]
  );

  const value: ConstructorStore = {
    api,
    selectedProjectId,
    setSelectedProjectId,
    projects,
    projectsLoading,
    projectsError,
    draftIssueId,
    draftLoading,
    draftError,
    draftRevision,
    cleanupDraft,
    createDraftDisabled,
    onCreateDraft,
    setDraftUrlData,
    showPlayground,
    openPlayground,
    closePlayground,
    playgroundUnlocked,
    resetSignal,
    triggerReset,
    viewMode,
    setViewMode,
    topPanelProps,
    bottomPanelProps
  };

  return <ConstructorStoreContext.Provider value={value}>{children}</ConstructorStoreContext.Provider>;
};
