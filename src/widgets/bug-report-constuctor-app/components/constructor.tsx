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
import type {SavedBlocks} from '../types.ts';
import {SummaryRow} from './summary-row.tsx';
import {appendSummaryChunk} from '../utils/summary-row-utils.ts';
import {PreconditionsRow} from './preconditions-row.tsx';
import {SavedBlocksPanel, type SavedBlocksTab} from './saved-blocks-panel.tsx';
import {StepItem, StepsConstructor, STEPS_DROP_ID} from './steps-constructor.tsx';
import {createId} from '../tools/id.ts';
import {normalizeSavedBlocks} from '../utils/saved-blocks-utils.ts';
import {FieldComponent} from './field-component.tsx';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {buildBugReportDescription, OutputFormat} from '../tools/markdown.ts';
import {safeGetItem, safeSetItem} from '../tools/safe-storage.ts';
import {copyToClipboard} from '../tools/clipboard.ts';

const EMPTY_SAVED_BLOCKS: SavedBlocks = {
  summary: [],
  preconditions: [],
  steps: []
};

export const Constructor: React.FC = () => {
  const [api, setApi] = useState<API | null>(null);

  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksSaving, setBlocksSaving] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksMessage, setBlocksMessage] = useState<string | null>(null);

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

  const generatedDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [outputFormat, setOutputFormat] = useState<OutputFormat>(() => {
    const stored = safeGetItem('bugReport.outputFormat');
    return stored === 'markdown_issue_template' || stored === 'markdown_default'
      ? stored
      : 'markdown_default';
  });

  useEffect(() => {
    safeSetItem('bugReport.outputFormat', outputFormat);
  }, [outputFormat]);

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
    outputFormat
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
      setBlocksMessage('Loaded saved blocks.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBlocksError(msg);
    } finally {
      setBlocksLoading(false);
    }
  }, [api]);

  const saveSavedBlocks = useCallback(async () => {
    if (!api) {
      return;
    }

    setBlocksMessage(null);
    setBlocksError(null);
    setBlocksSaving(true);
    try {
      await api.setSavedBlocks(savedBlocks);
      setBlocksMessage('Saved blocks.');
      const loaded = normalizeSavedBlocks(await api.getSavedBlocks());
      setSavedBlocks(loaded);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBlocksError(msg);
    } finally {
      setBlocksSaving(false);
    }
  }, [api, savedBlocks]);

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
      setCopyStatus('Copied.');
      return;
    }

    // Clipboard may be blocked by Permissions Policy in the host document.
    selectGeneratedDescription();
    setCopyStatus('Clipboard is blocked. Text selected — press Ctrl/Cmd+C to copy.');
  }, [description, selectGeneratedDescription]);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
      <div className="constructorLayout">
        <div className="constructorMain">
          <div className="issueForm">
            <SummaryRow
              value={summary}
              onValueChange={setSummary}
              onRegisterInsertAtCursor={onRegisterSummaryInsert}
            />

            <PreconditionsRow
              dropEnabled={activeDrag?.tab === 'preconditions'}
              value={preconditions}
              onValueChange={setPreconditions}
              onRegisterInsertAtCursor={onRegisterPreconditionsInsert}
            />

            <StepsConstructor steps={steps} onChangeSteps={setSteps} dropEnabled={stepsDropEnabled}/>

            <div className="expectedActualGrid">
              <FieldComponent label="Expected results" htmlFor="expected">
                <textarea
                  id="expected"
                  rows={6}
                  value={expected}
                  onChange={e => setExpected((e.target as HTMLTextAreaElement).value)}
                />
              </FieldComponent>

              <FieldComponent label="Current results" htmlFor="actual">
                <textarea
                  id="actual"
                  rows={6}
                  value={actual}
                  onChange={e => setActual((e.target as HTMLTextAreaElement).value)}
                />
              </FieldComponent>
            </div>

            <FieldComponent label="Additional information" htmlFor="additionalInfo">
              <textarea
                id="additionalInfo"
                rows={6}
                value={additionalInfo}
                onChange={e => setAdditionalInfo((e.target as HTMLTextAreaElement).value)}
              />
            </FieldComponent>

            <FieldComponent label="Output format" htmlFor="outputFormat">
              <select
                id="outputFormat"
                value={outputFormat}
                onChange={e => setOutputFormat((e.target as HTMLSelectElement).value as OutputFormat)}
              >
                <option value="markdown_default">Markdown (default)</option>
                <option value="markdown_issue_template">Markdown (issue template)</option>
              </select>
            </FieldComponent>

            <FieldComponent label="Generated description" htmlFor="generatedDescription">
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                <textarea
                  id="generatedDescription"
                  ref={generatedDescriptionRef}
                  rows={14}
                  readOnly
                  value={description}
                  onFocus={e => {
                    // Helpful for manual copy when Clipboard API is blocked.
                    (e.target as HTMLTextAreaElement).select();
                  }}
                />
                <div>
                  <Button
                    primary
                    onClick={onCopyDescription}
                  >
                    Copy to clipboard
                  </Button>
                </div>

                {copyStatus ? <div className="emptyHint">{copyStatus}</div> : null}
              </div>
            </FieldComponent>
          </div>
        </div>

        <SavedBlocksPanel
          blocks={savedBlocks}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onChangeBlocks={setSavedBlocks}
          onClickInsertSummary={insertSummaryChunk}
          onClickInsertPreconditions={insertPreconditions}
          onClickInsertStep={insertStep}
          loading={blocksLoading}
          saving={blocksSaving}
          error={blocksError}
          message={blocksMessage}
          onLoad={loadSavedBlocks}
          onSave={saveSavedBlocks}
        />
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="savedBlock savedBlockOverlay">
            <div className="savedBlockText">{activeDrag.text}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
