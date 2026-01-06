import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {arrayMove} from '@dnd-kit/sortable';

import {API} from '../api.ts';
import type {OutputFormatsPayload, SavedBlocks, SelectedCustomField} from '../types.ts';
import {SummaryRow} from './constructor/summary-row.tsx';
import {appendSummaryChunk, normalizeSummaryInsert} from '../utils/summary-row-utils.ts';
import {SavedBlocksPanel, type SavedBlocksTab} from './constructor/sidepanel/saved-blocks-panel.tsx';
import {STEPS_DROP_ID, type StepItem} from './constructor/form/steps-constructor.tsx';
import {createId} from '../tools/id.ts';
import {EMPTY_SAVED_BLOCKS, normalizeSavedBlocks} from '../utils/saved-blocks-utils.ts';
import {buildBugReportDescription, OutputFormat} from '../tools/markdown.ts';
import {copyToClipboard} from '../tools/clipboard.ts';
import {OutputFormatsForm} from './constructor/sidepanel/output-formats-form.tsx';
import {computeAdaptiveFields} from '../utils/template-ui.ts';
import {CustomFieldsConstructor} from './constructor/sidepanel/custom-fields-constructor.tsx';
import {useUserProjects} from '../tools/use-user-projects.ts';
import {useDraftCustomFields} from '../tools/use-draft-custom-fields.ts';
import {useDraftIssue} from '../tools/use-draft-issue.ts';
import {useAutoClearMessage} from '../tools/use-auto-clear-message.ts';
import {IssueForm} from './constructor/form/issue-form.tsx';
import {GeneratedDescription} from './constructor/sidepanel/generated-description.tsx';
import {ActiveDragOverlay} from './constructor/active-drag-overlay.tsx';
import {Optional} from './ui/optional.tsx';
import {TopPanel} from './top-panel.tsx';
import {BottomPanel} from './bottom-panel.tsx';
import {MESSAGE_HIDE_MS} from '../utils/ui-constants.ts';

const RESET_CLICKS_TO_UNLOCK_PLAYGROUND = 20;

function resolveActiveOutputFormat(payload: OutputFormatsPayload): OutputFormat {
  const active = payload.activeFormat;
  if (active === 'markdown_default') {
    return 'markdown_default';
  }

  const knownCustom = new Set(payload.formats.map(f => f.id));
  return knownCustom.has(active) ? active : 'markdown_default';
}

function normalizeSelectionForSavedBlock(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolveActiveTemplate(outputFormat: OutputFormat, templatesById: Record<string, string>): string {
  if (outputFormat === 'markdown_default') {
    return '';
  }
  return templatesById[outputFormat] ?? '';
}

function computeProjectSelectDisabled(params: {
  api: API | null;
  projectsLoading: boolean;
  draftLoading: boolean;
}): boolean {
  return !params.api || params.projectsLoading || params.draftLoading;
}

function mergeNullableErrors(primary: string | null, secondary: string | null): string | null {
  return primary ?? secondary;
}

export type ConstructorProps = {
  onRegisterReset?: (fn: (() => void) | null) => void;
  onOpenPlayground?: () => void;
  playgroundUnlocked?: boolean;
  onUnlockPlayground?: () => void;
};

const ConstructorImpl: React.FC<ConstructorProps> = ({
  onRegisterReset,
  onOpenPlayground,
  playgroundUnlocked,
  onUnlockPlayground
}) => {
  const [api, setApi] = useState<API | null>(null);

  const apiRef = useRef<API | null>(null);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCustomFields, setSelectedCustomFields] = useState<SelectedCustomField[]>([]);

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

  const {
    fields: customFields,
    loading: customFieldsLoading,
    error: customFieldsError
  } = useDraftCustomFields(api, draftIssueId, draftRevision);

  const [, setResetClicksInRow] = useState(0);

  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksSaving, setBlocksSaving] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState<string | null>(null);

  const clearBlocksMessage = useCallback(() => {
    setBlocksMessage(null);
  }, []);
  useAutoClearMessage(blocksMessage, clearBlocksMessage, MESSAGE_HIDE_MS);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) {
      return null;
    }
    return projects.find(p => p.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const [savedBlocks, setSavedBlocks] = useState<SavedBlocks>(EMPTY_SAVED_BLOCKS);
  const [activeTab, setActiveTab] = useState<SavedBlocksTab>('summary');
  const [activeDrag, setActiveDrag] = useState<{tab: SavedBlocksTab; text: string} | null>(null);

  const [summary, setSummary] = useState('');

  const summaryInsertRef = useRef<((text: string) => void) | null>(null);

  const onRegisterSummaryInsert = useCallback((fn: ((text: string) => void) | null) => {
    summaryInsertRef.current = fn;
  }, []);

  const [preconditions, setPreconditions] = useState('');
  const [steps, setSteps] = useState<StepItem[]>([]);

  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const generatedDescriptionRef = useRef<HTMLTextAreaElement>(null!);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [outputFormatsLoading, setOutputFormatsLoading] = useState(false);
  const [outputFormatsSaving, setOutputFormatsSaving] = useState(false);
  const [outputFormatsError, setOutputFormatsError] = useState<string | null>(null);
  const [outputFormatsMessage, setOutputFormatsMessage] = useState<string | null>(null);

  const clearOutputFormatsMessage = useCallback(() => {
    setOutputFormatsMessage(null);
  }, []);
  useAutoClearMessage(outputFormatsMessage, clearOutputFormatsMessage, MESSAGE_HIDE_MS);

  const [outputFormats, setOutputFormats] = useState<OutputFormatsPayload>({
    activeFormat: 'markdown_default',
    formats: []
  });

  const [outputFormat, setOutputFormat] = useState<OutputFormat>('markdown_default');
  const [showFormatsEditor, setShowFormatsEditor] = useState(false);

  const autoLoadedSavedBlocksRef = useRef(false);

  const uniqAppend = useCallback((list: string[], items: string[]): string[] => {
    if (!items.length) {
      return list;
    }
    const set = new Set(list);
    const next = [...list];
    for (const item of items) {
      const t = item.trim();
      if (!t) {
        continue;
      }
      if (set.has(t)) {
        continue;
      }
      set.add(t);
      next.push(t);
    }
    return next;
  }, []);

  const templatesById = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of outputFormats.formats) {
      map[f.id] = f.template;
    }
    return map;
  }, [outputFormats.formats]);

  const activeTemplate = resolveActiveTemplate(outputFormat, templatesById);

  const adaptiveFields = React.useMemo(() => {
    return computeAdaptiveFields({format: outputFormat, template: activeTemplate});
  }, [activeTemplate, outputFormat]);

  const customFieldsText = useMemo(() => {
    if (!selectedCustomFields.length) {
      return '';
    }
    const byId = new Map(customFields.map(f => [f.id, f] as const));

    const lines = selectedCustomFields
      .map(sel => {
        const name = byId.get(sel.id)?.name;
        if (!name) {
          return '';
        }
        const value = sel.value.trim();
        return value ? `- ${name}: ${value}` : `- ${name}`;
      })
      .filter(Boolean);

    if (!lines.length) {
      return '';
    }
    return `Custom fields:\n${lines.join('\n')}`;
  }, [customFields, selectedCustomFields]);

  const additionalInfoForDescription = useMemo(() => {
    const base = additionalInfo.trim();
    const extra = customFieldsText.trim();
    if (!extra) {
      return additionalInfo;
    }
    if (!base) {
      return extra;
    }
    return `${base}\n\n${extra}`;
  }, [additionalInfo, customFieldsText]);

  const description = buildBugReportDescription(
    {
      summary,
      preconditions: preconditions.split('\n'),
      steps: steps.map(s => s.text),
      expected,
      actual,
      additionalInfo: additionalInfoForDescription,
      attachments: []
    },
    outputFormat,
    {templatesById}
  );

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

  const onSelectedProjectIdChange = useCallback((next: string) => {
    setSelectedProjectId(next);
    setSelectedCustomFields([]);
  }, []);

  const onCreateDraft = useCallback(() => {
    if (!api || !selectedProject) {
      return;
    }

    cleanupDraft();
    const baseUrl = api.getBaseUrl();
    const url = `${baseUrl}newIssue?project=${encodeURIComponent(selectedProject.shortName)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }, [api, cleanupDraft, selectedProject]);

  useEffect(() => {
    if (!api) {
      return () => {
        // no-op
      };
    }

    let disposed = false;
    (async () => {
      setOutputFormatsMessage(null);
      setOutputFormatsError(null);
      setOutputFormatsLoading(true);
      try {
        const loaded = await api.getOutputFormats();
        if (disposed) {
          return;
        }
        setOutputFormats(loaded);

        setOutputFormat(resolveActiveOutputFormat(loaded));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setOutputFormatsError(msg);
      } finally {
        if (!disposed) {
          setOutputFormatsLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;
    };
  }, [api]);

  const persistOutputFormats = useCallback(async (next: OutputFormatsPayload) => {
    if (!api) {
      setOutputFormats(next);
      return;
    }
    setOutputFormatsMessage(null);
    setOutputFormatsError(null);
    setOutputFormatsSaving(true);
    try {
      const saved = await api.setOutputFormats(next);
      setOutputFormats(saved);
      setOutputFormatsMessage('New output format is applied');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOutputFormatsError(msg);
      // Keep local changes in-memory.
      setOutputFormats(next);
    } finally {
      setOutputFormatsSaving(false);
    }
  }, [api]);

  const loadSavedBlocks = useCallback(async () => {
    if (!api) {
      return;
    }

    setBlocksMessage(null);
    setBlocksError(null);
    setBlocksLoading(true);
    try {
      const loaded = normalizeSavedBlocks(await api.getSavedBlocks());
      setSavedBlocks(loaded);
      const hasAny = !!(
        loaded.summary.length ||
        loaded.preconditions.length ||
        loaded.steps.length
      );
      if (hasAny) {
        setBlocksMessage('Loaded saved blocks');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBlocksError(msg);
    } finally {
      setBlocksLoading(false);
    }
  }, [api]);

  const persistSavedBlocks = useCallback(
    (next: SavedBlocks, options?: {successMessage?: string}) => {
      // Optimistic local update to keep UI responsive.
      setSavedBlocks(next);

      const successMessage = options?.successMessage;

      if (!api) {
        setBlocksMessage(successMessage ?? null);
        return Promise.resolve();
      }

      setBlocksMessage(null);
      setBlocksError(null);
      setBlocksSaving(true);

      return api
        .setSavedBlocks(next)
        .then(result => {
          const saved = normalizeSavedBlocks(result);
          setSavedBlocks(saved);
          setBlocksMessage(successMessage ?? 'Saved blocks updated');
        })
        .catch(e => {
          const msg = e instanceof Error ? e.message : String(e);
          setBlocksError(msg);
        })
        .finally(() => {
          setBlocksSaving(false);
        });
    },
    [api]
  );

  const onChangeSavedBlocks = useCallback(
    (next: SavedBlocks) => {
      persistSavedBlocks(next).catch(() => {
        // errors are already surfaced via component state inside persistSavedBlocks
      });
    },
    [persistSavedBlocks]
  );

  useEffect(() => {
    if (!api) {
      return;
    }
    if (autoLoadedSavedBlocksRef.current) {
      return;
    }
    autoLoadedSavedBlocksRef.current = true;
    loadSavedBlocks().catch(() => {
      // errors are already surfaced via component state inside loadSavedBlocks
    });
  }, [api, loadSavedBlocks]);


  const onSummaryFocused = useCallback(() => {
    setActiveTab('summary');
  }, []);

  const onPreconditionsFocused = useCallback(() => {
    setActiveTab('preconditions');
  }, []);

  const onStepsFocused = useCallback(() => {
    setActiveTab('steps');
  }, []);

  const savePreconditionsToSavedBlocks = useCallback(async () => {
    const items = preconditions
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    if (!items.length) {
      return;
    }

    const next = {
      ...savedBlocks,
      preconditions: uniqAppend(savedBlocks.preconditions, items)
    };
    await persistSavedBlocks(next, {successMessage: 'Saved preconditions to Saved Blocks'});
    setActiveTab('preconditions');
  }, [persistSavedBlocks, preconditions, savedBlocks, uniqAppend]);

  const onSaveSummarySelection = useCallback(
    async (text: string) => {
      const clean = normalizeSummaryInsert(text);
      if (!clean) {
        return;
      }
      const next = {
        ...savedBlocks,
        summary: uniqAppend(savedBlocks.summary, [clean])
      };
      await persistSavedBlocks(next, {successMessage: 'Saved summary block'});
      setActiveTab('summary');
    },
    [persistSavedBlocks, savedBlocks, uniqAppend]
  );

  const onSavePreconditionsSelection = useCallback(
    async (text: string) => {
      const clean = normalizeSelectionForSavedBlock(text);
      if (!clean) {
        return;
      }
      const next = {
        ...savedBlocks,
        preconditions: uniqAppend(savedBlocks.preconditions, [clean])
      };
      await persistSavedBlocks(next, {successMessage: 'Saved preconditions block'});
      setActiveTab('preconditions');
    },
    [persistSavedBlocks, savedBlocks, uniqAppend]
  );

  const onSaveStep = useCallback(
    async (text: string) => {
      const clean = normalizeSelectionForSavedBlock(text);
      if (!clean) {
        return;
      }

      const next = {
        ...savedBlocks,
        steps: uniqAppend(savedBlocks.steps, [clean])
      };
      await persistSavedBlocks(next, {successMessage: 'Saved step block'});
      setActiveTab('steps');
    },
    [persistSavedBlocks, savedBlocks, uniqAppend]
  );

  const onResetForm = useCallback(() => {
    setSummary('');
    setPreconditions('');
    setSteps([]);
    setExpected('');
    setActual('');
    setAdditionalInfo('');
    setCopyStatus(null);
    setSelectedCustomFields([]);

    setResetClicksInRow(prev => {
      const next = prev + 1;
      if (next >= RESET_CLICKS_TO_UNLOCK_PLAYGROUND) {
        onUnlockPlayground?.();
        return RESET_CLICKS_TO_UNLOCK_PLAYGROUND;
      }
      return next;
    });
  }, [onUnlockPlayground]);

  useEffect(() => {
    onRegisterReset?.(onResetForm);
    return () => {
      onRegisterReset?.(null);
    };
  }, [onRegisterReset, onResetForm]);

  const insertSummaryChunk = useCallback((text: string) => {
    if (summaryInsertRef.current) {
      summaryInsertRef.current(text);
      return;
    }
    setSummary(prev => appendSummaryChunk(prev, text));
  }, []);

  const preconditionsInsertRef = useRef<((text: string) => void) | null>(null);

  const onRegisterPreconditionsInsert = useCallback((fn: ((text: string) => void) | null) => {
    preconditionsInsertRef.current = fn;
  }, []);

  const insertPreconditions = useCallback((text: string) => {
    preconditionsInsertRef.current?.(text);
  }, []);

  const insertStep = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) {
      return;
    }
    setSteps(prev => [...prev, {id: createId('issue'), text: clean}]);
  }, []);

  const stepsDropEnabled = activeDrag?.tab === 'steps';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
    if (!data?.tab || !data.text) {
      return;
    }

    const tab: SavedBlocksTab = data.tab;
    const text: string = data.text;

    // DnD-kit collision detection depends on registered droppables.
    // Ensure drop-enabled props are updated synchronously before the drag proceeds.
    flushSync(() => {
      setActiveDrag({tab, text});
    });
  }, []);

  const getDropPayload = useCallback((event: DragEndEvent) => {
    const overId = event.over?.id;
    const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
    if (!overId || !data?.tab || !data.text) {
      return null;
    }
    return {overId, tab: data.tab, text: data.text};
  }, []);

  const reorderStepById = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) {
      return;
    }
    setSteps(prev => {
      const oldIndex = prev.findIndex(s => s.id === activeId);
      const newIndex = prev.findIndex(s => s.id === overId);
      if (oldIndex < 0 || newIndex < 0) {
        return prev;
      }
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleStepReorderDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as {type?: string} | undefined;
      if (activeData?.type !== 'step') {
        return false;
      }

      const overId = event.over?.id;
      if (!overId || overId === event.active.id) {
        return true;
      }

      reorderStepById(String(event.active.id), String(overId));
      return true;
    },
    [reorderStepById]
  );

  const handleSavedBlocksDropEnd = useCallback(
    (event: DragEndEvent) => {
      const payload = getDropPayload(event);
      if (!payload || payload.tab !== 'steps') {
        return;
      }

      if (payload.overId === STEPS_DROP_ID) {
        setSteps(prev => [...prev, {id: createId('issue'), text: payload.text}]);
        return;
      }

      const overData = event.over?.data.current as {type?: string} | undefined;
      if (overData?.type === 'step') {
        setSteps(prev => [...prev, {id: createId('issue'), text: payload.text}]);
      }
    },
    [getDropPayload]
  );

  const onDragEnd = useCallback((event: DragEndEvent) => {
    flushSync(() => {
      setActiveDrag(null);
    });

    if (handleStepReorderDragEnd(event)) {
      return;
    }

    handleSavedBlocksDropEnd(event);
  }, [handleSavedBlocksDropEnd, handleStepReorderDragEnd]);

  const onDragCancel = useCallback(() => {
    flushSync(() => {
      setActiveDrag(null);
    });
  }, []);

  const selectGeneratedDescription = useCallback(() => {
    const el = generatedDescriptionRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.select();
    el.setSelectionRange?.(0, el.value.length);
  }, []);

  const onCopyDescription = useCallback(async () => {
    setCopyStatus(null);
    const result = await copyToClipboard(description);

    if (result === 'copied') {
      setCopyStatus('Copied');
      return;
    }

    // Clipboard may be blocked by Permissions Policy in the host document.
    selectGeneratedDescription();
    setCopyStatus('Clipboard is blocked. Text selected — press Ctrl/Cmd+C to copy');
  }, [description, selectGeneratedDescription]);

  const onExpectedChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExpected(e.target.value);
  }, []);

  const onActualChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setActual(e.target.value);
  }, []);

  const onAdditionalInfoChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalInfo(e.target.value);
  }, []);

  const onGeneratedDescriptionFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Helpful for manual copy when Clipboard API is blocked.
    e.target.select();
  }, []);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-4 pb-24">
        <TopPanel
          onResetForm={onResetForm}
          onOpenPlayground={playgroundUnlocked ? onOpenPlayground : undefined}
          projectSelectDisabled={computeProjectSelectDisabled({api, projectsLoading, draftLoading})}
          selectedProjectId={selectedProjectId}
          projects={projects}
          projectsLoading={projectsLoading}
          onSelectedProjectIdChange={onSelectedProjectIdChange}
          projectsError={projectsError}
        />

        <SummaryRow
          value={summary}
          onValueChange={setSummary}
          onRegisterInsertAtCursor={onRegisterSummaryInsert}
          dropEnabled={activeDrag?.tab === 'summary'}
          onFocused={onSummaryFocused}
          onSaveSelection={onSaveSummarySelection}
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <IssueForm
            adaptiveFields={adaptiveFields}
            activeDrag={activeDrag}
            preconditions={preconditions}
            onPreconditionsChange={setPreconditions}
            onRegisterPreconditionsInsert={onRegisterPreconditionsInsert}
            onPreconditionsFocused={onPreconditionsFocused}
            onSavePreconditionsSelection={onSavePreconditionsSelection}
            onSavePreconditionsToSavedBlocks={savePreconditionsToSavedBlocks}
            steps={steps}
            onChangeSteps={setSteps}
            stepsDropEnabled={stepsDropEnabled}
            onStepsFocused={onStepsFocused}
            onSaveStep={onSaveStep}
            savedStepBlocks={savedBlocks.steps}
            expected={expected}
            onExpectedChange={onExpectedChange}
            actual={actual}
            onActualChange={onActualChange}
            additionalInfo={additionalInfo}
            onAdditionalInfoChange={onAdditionalInfoChange}
          />

          <div className="flex w-full flex-col gap-4 lg:w-[420px] lg:flex-none xl:w-[520px]">
            <SavedBlocksPanel
              blocks={savedBlocks}
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              onChangeBlocks={onChangeSavedBlocks}
              onClickInsertSummary={insertSummaryChunk}
              onClickInsertPreconditions={insertPreconditions}
              onClickInsertStep={insertStep}
              loading={blocksLoading}
              saving={blocksSaving}
              error={blocksError}
              message={blocksMessage}
            />

            <Optional when={Boolean(selectedProjectId)}>
              <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3">
                <CustomFieldsConstructor
                  key={selectedProjectId}
                  availableFields={customFields}
                  selectedFields={selectedCustomFields}
                  onChangeSelectedFields={setSelectedCustomFields}
                  loading={customFieldsLoading}
                  error={mergeNullableErrors(draftError, customFieldsError)}
                />
              </div>
            </Optional>

            <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)]">
              <div className="border-b border-[var(--ring-borders-color)] p-3">
                <OutputFormatsForm
                  outputFormat={outputFormat}
                  setOutputFormat={setOutputFormat}
                  outputFormats={outputFormats}
                  setOutputFormats={setOutputFormats}
                  persistOutputFormats={persistOutputFormats}
                  loading={outputFormatsLoading}
                  saving={outputFormatsSaving}
                  error={outputFormatsError}
                  message={outputFormatsMessage}
                  showEditor={showFormatsEditor}
                  setShowEditor={setShowFormatsEditor}
                />
              </div>

              <div className="p-3">
                <GeneratedDescription
                  description={description}
                  generatedDescriptionRef={generatedDescriptionRef}
                  onGeneratedDescriptionFocus={onGeneratedDescriptionFocus}
                  onCopyDescription={onCopyDescription}
                  copyStatus={copyStatus}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomPanel createDraftDisabled={!api || !selectedProjectId} onCreateDraft={onCreateDraft}/>

      <DragOverlay>
        <ActiveDragOverlay activeDrag={activeDrag}/>
      </DragOverlay>
    </DndContext>
  );
};

export const Constructor = ConstructorImpl;
