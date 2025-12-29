import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {TwButton} from './components/tw-button.tsx';
import {FieldComponent} from './components/field-component.tsx';
import {TwTextarea} from './components/tw-textarea.tsx';
import {API} from './api.ts';
import {SavedBlocks} from './types.ts';
import {normalizeSavedBlocks} from './utils/saved-blocks-utils.ts';
import {computeIsBusy, computeLoadSaveTitles, computeStatus} from './tools/ui-state.ts';

const JSON_PRETTY_SPACES = 2;

function buildUiState(params: {
  api: API | null;
  loading: boolean;
  saving: boolean;
  message: string | null;
  error: string | null;
}): {
  isBusy: boolean;
  canCallApi: boolean;
  loadTitle: string;
  saveTitle: string;
  showStatus: boolean;
  statusClassName: string;
  statusText: string | null;
} {
  const isBusy = computeIsBusy(params.loading, params.saving);
  const canCallApi = !!params.api && !isBusy;
  const titles = computeLoadSaveTitles({
    loading: params.loading,
    saving: params.saving,
    loadIdleTitle: 'Load saved blocks',
    saveIdleTitle: 'Save saved blocks'
  });
  const status = computeStatus({message: params.message, error: params.error});
  return {isBusy, canCallApi, ...titles, ...status};
}

export const ApiPlayground: React.FunctionComponent = () => {
  const [api, setApi] = useState<API | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [summaryText, setSummaryText] = useState('');
  const [preconditionsText, setPreconditionsText] = useState('');
  const [stepsText, setStepsText] = useState('');

  const [lastLoaded, setLastLoaded] = useState<SavedBlocks | null>(null);

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

  const collectedBlocks = useMemo<SavedBlocks>(() => {
    const summary = summaryText
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const preconditions = preconditionsText
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const steps = stepsText
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    return {
      summary,
      preconditions,
      steps,
    };
  }, [preconditionsText, stepsText, summaryText]);

  const load = useCallback(async () => {
    if (!api) {
      return;
    }

    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const result = normalizeSavedBlocks(await api.getSavedBlocks());
      setLastLoaded(result);
      setSummaryText(result.summary.join('\n'));
      setPreconditionsText(result.preconditions.join('\n'));
      setStepsText(result.steps.join('\n'));
      setMessage('Loaded saved blocks');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const save = useCallback(async () => {
    if (!api) {
      return;
    }

    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      await api.setSavedBlocks(collectedBlocks);
      const refreshed = normalizeSavedBlocks(await api.getSavedBlocks());
      setLastLoaded(refreshed);
      setSummaryText(refreshed.summary.join('\n'));
      setPreconditionsText(refreshed.preconditions.join('\n'));
      setStepsText(refreshed.steps.join('\n'));
      setMessage('Saved and reloaded saved blocks');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [api, collectedBlocks]);

  const resetForm = useCallback(() => {
    setMessage(null);
    setError(null);
    setLastLoaded(null);
    setSummaryText('');
    setPreconditionsText('');
    setStepsText('');
  }, []);

  const onSummaryChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummaryText(e.target.value);
  }, []);

  const onPreconditionsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPreconditionsText(e.target.value);
  }, []);

  const onStepsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStepsText(e.target.value);
  }, []);

  const {isBusy, canCallApi, loadTitle, saveTitle, showStatus, statusClassName, statusText} = buildUiState({
    api,
    loading,
    saving,
    message,
    error
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6">
        <FieldComponent label="Summary">
          <TwTextarea value={summaryText} onChange={onSummaryChange} rows={3}/>
        </FieldComponent>

        <FieldComponent label="Preconditions">
          <TwTextarea value={preconditionsText} onChange={onPreconditionsChange} rows={3}/>
        </FieldComponent>

        <FieldComponent label="Steps (one per line)">
          <TwTextarea value={stepsText} onChange={onStepsChange} rows={6}/>
        </FieldComponent>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TwButton variant="primary" disabled={!canCallApi} onClick={load}>
          {loadTitle}
        </TwButton>
        <TwButton variant="primary" disabled={!canCallApi} onClick={save}>
          {saveTitle}
        </TwButton>
        <TwButton disabled={isBusy} onClick={resetForm}>
          {'Reset form'}
        </TwButton>
      </div>

      {showStatus ? <div className={statusClassName}>{statusText}</div> : null}

      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-semibold">Payload to save</div>
        <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
          {JSON.stringify(collectedBlocks, null, JSON_PRETTY_SPACES)}
        </pre>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[13px] font-semibold">Last loaded from backend</div>
        <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
          {JSON.stringify(lastLoaded, null, JSON_PRETTY_SPACES)}
        </pre>
      </div>
    </div>
  );
};
