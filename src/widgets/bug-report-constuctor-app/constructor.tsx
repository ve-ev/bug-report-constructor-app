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

import {API} from './api.ts';
import type {SavedBlocks} from './types.ts';
import {appendSummaryChunk, IssueSummaryRow} from './issue-summary-row.tsx';
import {PreconditionsRow} from './preconditions-row.tsx';
import {SavedBlocksPanel, type SavedBlocksTab} from './saved-blocks-panel.tsx';
import {StepItem, StepsConstructor, STEPS_DROP_ID} from './steps-constructor.tsx';

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

  const [preconditions, setPreconditions] = useState('');
  const [steps, setSteps] = useState<StepItem[]>([]);

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

  const normalizeSavedBlocks = useCallback((value: SavedBlocks | null | undefined): SavedBlocks => {
    return {
      summary: Array.isArray(value?.summary) ? value.summary : [],
      preconditions: Array.isArray(value?.preconditions) ? value.preconditions : [],
      steps: Array.isArray(value?.steps) ? value.steps : []
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
  }, [api, normalizeSavedBlocks]);

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
  }, [api, normalizeSavedBlocks, savedBlocks]);

  const insertSummaryChunk = useCallback((text: string) => {
    if (summaryInsertRef.current) {
      summaryInsertRef.current(text);
      return;
    }
    setSummary(prev => appendSummaryChunk(prev, text));
  }, []);

  const preconditionsInsertRef = useRef<((text: string) => void) | null>(null);

  const insertPreconditions = useCallback((text: string) => {
    preconditionsInsertRef.current?.(text);
  }, []);

  const insertStep = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) {
      return;
    }
    setSteps(prev => [...prev, {id: createId(), text: clean}]);
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

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const overId = event.over?.id;
    const data = event.active.data.current as {tab?: SavedBlocksTab; text?: string} | undefined;
    const text = data?.text;
    const tab = data?.tab;

    setActiveDrag(null);

    if (!overId || !text || !tab) {
      return;
    }

    if (overId === STEPS_DROP_ID && tab === 'steps') {
      setSteps(prev => [...prev, {id: createId(), text}]);
    }
  }, []);

  const onDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
      <div className="constructorLayout">
        <div className="constructorMain">
          <div className="issueForm">
            <IssueSummaryRow
              value={summary}
              onValueChange={setSummary}
              onRegisterInsertAtCursor={fn => {
                summaryInsertRef.current = fn;
              }}
            />

            <PreconditionsRow
              dropEnabled={activeDrag?.tab === 'preconditions'}
              value={preconditions}
              onValueChange={setPreconditions}
              onRegisterInsertAtCursor={fn => {
                preconditionsInsertRef.current = fn;
              }}
              rows={5}
            />

            <StepsConstructor steps={steps} onChangeSteps={setSteps} dropEnabled={stepsDropEnabled}/>
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

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `issue_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
