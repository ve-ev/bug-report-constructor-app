import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';

import {API} from '../api.ts';
import type {OutputFormatsPayload, SavedBlocks} from '../types.ts';
import {SummaryRow} from './summary-row.tsx';
import {appendSummaryChunk, normalizeSummaryInsert} from '../utils/summary-row-utils.ts';
import {PreconditionsRow} from './preconditions-row.tsx';
import {SavedBlocksPanel, type SavedBlocksTab} from './saved-blocks-panel.tsx';
import {StepItem, StepsConstructor, STEPS_DROP_ID} from './steps-constructor.tsx';
import {createId} from '../tools/id.ts';
import {normalizeSavedBlocks} from '../utils/saved-blocks-utils.ts';
import {FieldComponent} from './field-component.tsx';
import {buildBugReportDescription, OutputFormat} from '../tools/markdown.ts';
import {copyToClipboard} from '../tools/clipboard.ts';
import {OutputFormatsForm} from './output-formats-form.tsx';
import {computeAdaptiveFields} from '../utils/template-ui.ts';
import {TwButton} from './tw-button.tsx';

const EMPTY_SAVED_BLOCKS: SavedBlocks = {
  summary: [],
  preconditions: [],
  steps: []
};

const BLOCK_MESSAGE_HIDE_MS = 1500;

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

export type ConstructorProps = {
  onRegisterReset?: (fn: (() => void) | null) => void;
};

// eslint-disable-next-line complexity
const ConstructorImpl: React.FC<ConstructorProps> = ({onRegisterReset}) => {
  const [api, setApi] = useState<API | null>(null);

  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksSaving, setBlocksSaving] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState<string | null>(null);

  useEffect(() => {
    let t: number | undefined;
    if (blocksMessage) {
      t = window.setTimeout(() => {
        setBlocksMessage(null);
      }, BLOCK_MESSAGE_HIDE_MS);
    }
    return () => {
      if (t !== undefined) {
        window.clearTimeout(t);
      }
    };
  }, [blocksMessage]);

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
  const [lastAddedStepText, setLastAddedStepText] = useState<string | null>(null);

  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const generatedDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showGeneratedDescription, setShowGeneratedDescription] = useState(false);

  const [outputFormatsLoading, setOutputFormatsLoading] = useState(false);
  const [outputFormatsSaving, setOutputFormatsSaving] = useState(false);
  const [outputFormatsError, setOutputFormatsError] = useState<string | null>(null);
  const [outputFormatsMessage, setOutputFormatsMessage] = useState<string | null>(null);

  useEffect(() => {
    let t: number | undefined;
    if (outputFormatsMessage) {
      t = window.setTimeout(() => {
        setOutputFormatsMessage(null);
      }, BLOCK_MESSAGE_HIDE_MS);
    }
    return () => {
      if (t !== undefined) {
        window.clearTimeout(t);
      }
    };
  }, [outputFormatsMessage]);

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

  const activeTemplate = outputFormat === 'markdown_default' ? '' : (templatesById[outputFormat] ?? '');

  const adaptiveFields = React.useMemo(() => {
    return computeAdaptiveFields({format: outputFormat, template: activeTemplate});
  }, [activeTemplate, outputFormat]);

  const description = buildBugReportDescription(
    {
      summary,
      preconditions: preconditions.split('\n'),
      steps: steps.map(s => s.text),
      expected,
      actual,
      additionalInfo,
      attachments: []
    },
    outputFormat,
    {templatesById}
  );

  useEffect(() => {
    let disposed = false;
    (async () => {
      const host = await YTApp.register();
      if (disposed) {
        return;
      }
      setApi(new API(host));
    })();
    return () => {
      disposed = true;
    };
  }, []);

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
    // eslint-disable-next-line complexity
    async (next: SavedBlocks, options?: {successMessage?: string}) => {
      // Optimistic local update to keep UI responsive.
      setSavedBlocks(next);

      if (!api) {
        setBlocksMessage(options?.successMessage ?? null);
        return;
      }

      setBlocksMessage(null);
      setBlocksError(null);
      setBlocksSaving(true);
      try {
        const saved = normalizeSavedBlocks(await api.setSavedBlocks(next));
        setSavedBlocks(saved);
        setBlocksMessage(options?.successMessage ?? 'Saved blocks updated');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setBlocksError(msg);
        // Keep optimistic UI state in-memory.
      } finally {
        setBlocksSaving(false);
      }
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

  const onStepAdded = useCallback((text: string) => {
    setLastAddedStepText(text);
  }, []);

  const saveLastStepToSavedBlocks = useCallback(async () => {
    const t = (lastAddedStepText ?? '').trim();
    if (!t) {
      return;
    }

    const next = {
      ...savedBlocks,
      steps: uniqAppend(savedBlocks.steps, [t])
    };
    await persistSavedBlocks(next, {successMessage: 'Saved last added step to Saved Blocks'});
    setActiveTab('steps');
  }, [lastAddedStepText, persistSavedBlocks, savedBlocks, uniqAppend]);

  const onResetForm = useCallback(() => {
    setSummary('');
    setPreconditions('');
    setSteps([]);
    setLastAddedStepText(null);
    setExpected('');
    setActual('');
    setAdditionalInfo('');
    setCopyStatus(null);
  }, []);

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
    if (data?.tab && data?.text) {
      setActiveDrag({tab: data.tab, text: data.text});
    }
  }, []);

  const getDropPayload = useCallback((event: DragEndEvent) => {
    const overId = event.over?.id;
    const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
    if (!overId || !data?.tab || !data.text) {
      return null;
    }
    return {overId, tab: data.tab, text: data.text};
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);

    const payload = getDropPayload(event);
    if (payload?.overId === STEPS_DROP_ID && payload.tab === 'steps') {
      setSteps(prev => [...prev, {id: createId('issue'), text: payload.text}]);
    }
  }, [getDropPayload]);

  const onDragCancel = useCallback(() => {
    setActiveDrag(null);
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

  const onToggleGeneratedDescription = useCallback(() => {
    setShowGeneratedDescription(prev => !prev);
  }, []);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6">
            <SummaryRow
              value={summary}
              onValueChange={setSummary}
              onRegisterInsertAtCursor={onRegisterSummaryInsert}
              dropEnabled={activeDrag?.tab === 'summary'}
              onFocused={onSummaryFocused}
              onSaveSelection={onSaveSummarySelection}
            />

            {adaptiveFields.preconditions.visible ? (
              <>
                <PreconditionsRow
                  label={adaptiveFields.preconditions.label}
                  dropEnabled={activeDrag?.tab === 'preconditions'}
                  value={preconditions}
                  onValueChange={setPreconditions}
                  onRegisterInsertAtCursor={onRegisterPreconditionsInsert}
                  onFocused={onPreconditionsFocused}
                  onSaveSelection={onSavePreconditionsSelection}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <TwButton disabled={!preconditions.trim()} onClick={savePreconditionsToSavedBlocks}>
                    Save Preconditions to Saved Blocks
                  </TwButton>
                </div>
              </>
            ) : null}

            {adaptiveFields.steps.visible ? (
              <>
                <StepsConstructor
                  label={adaptiveFields.steps.label}
                  steps={steps}
                  onChangeSteps={setSteps}
                  dropEnabled={stepsDropEnabled}
                  onFocused={onStepsFocused}
                  onStepAdded={onStepAdded}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <TwButton disabled={!lastAddedStepText?.trim()} onClick={saveLastStepToSavedBlocks}>
                    Save last added step to Saved Blocks
                  </TwButton>
                </div>
              </>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {adaptiveFields.expected.visible ? (
                <FieldComponent label={adaptiveFields.expected.label} htmlFor="expected">
                  <textarea
                    id="expected"
                    rows={6}
                    value={expected}
                    onChange={onExpectedChange}
                    className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                  />
                </FieldComponent>
              ) : null}

              {adaptiveFields.actual.visible ? (
                <FieldComponent label={adaptiveFields.actual.label} htmlFor="actual">
                  <textarea
                    id="actual"
                    rows={6}
                    value={actual}
                    onChange={onActualChange}
                    className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                  />
                </FieldComponent>
              ) : null}
            </div>

            {adaptiveFields.additionalInfo.visible ? (
              <FieldComponent label={adaptiveFields.additionalInfo.label} htmlFor="additionalInfo">
                <textarea
                  id="additionalInfo"
                  rows={6}
                  value={additionalInfo}
                  onChange={onAdditionalInfoChange}
                  className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                />
              </FieldComponent>
            ) : null}
          </div>
        </div>

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
              <FieldComponent label="Generated description" htmlFor="generatedDescription">
                <div className="flex flex-col gap-2">
                  <div>
                    <TwButton onClick={onToggleGeneratedDescription}>
                      {showGeneratedDescription ? 'Hide preview' : 'Show preview'}
                    </TwButton>
                  </div>

                  {showGeneratedDescription ? (
                    <>
                      <textarea
                        id="generatedDescription"
                        ref={generatedDescriptionRef}
                        rows={14}
                        readOnly
                        value={description}
                        onFocus={onGeneratedDescriptionFocus}
                        className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                      />
                      <div>
                        <TwButton variant="primary" onClick={onCopyDescription}>
                          Copy to clipboard
                        </TwButton>
                      </div>
                    </>
                  ) : null}

                  {copyStatus ? (
                    <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
                      {copyStatus}
                    </div>
                  ) : null}
                </div>
              </FieldComponent>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div
            className="w-[min(520px,calc(100vw-24px))] rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 shadow-lg"
            style={{background: 'color-mix(in srgb, var(--ring-content-background-color) 92%, transparent)'}}
          >
            <div className="whitespace-pre-wrap break-words text-[13px] leading-5">{activeDrag.text}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export const Constructor = ConstructorImpl;
