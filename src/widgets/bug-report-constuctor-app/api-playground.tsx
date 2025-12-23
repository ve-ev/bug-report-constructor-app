import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
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
      // Register widget in YouTrack. To learn more, see
      // https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
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
    <div className="apiPlayground">
      <div className="form">
        <label className="field">
          <div className="fieldLabel">Summary</div>
          <textarea
            className="fieldInput"
            value={summaryText}
            onChange={onSummaryChange}
            rows={3}
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Preconditions</div>
          <textarea
            className="fieldInput"
            value={preconditionsText}
            onChange={onPreconditionsChange}
            rows={3}
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Steps (one per line)</div>
          <textarea
            className="fieldInput"
            value={stepsText}
            onChange={onStepsChange}
            rows={6}
          />
        </label>
      </div>

      <div className="actions">
        <Button primary disabled={!canCallApi} onClick={load}>
          {loadTitle}
        </Button>
        <Button primary disabled={!canCallApi} onClick={save}>
          {saveTitle}
        </Button>
        <Button disabled={isBusy} onClick={resetForm}>
          {'Reset form'}
        </Button>
      </div>

      {showStatus ? <div className={statusClassName}>{statusText}</div> : null}

      <div className="preview">
        <div className="previewTitle">Payload to save</div>
        <pre className="previewBody">{JSON.stringify(collectedBlocks, null, JSON_PRETTY_SPACES)}</pre>
      </div>

      <div className="preview">
        <div className="previewTitle">Last loaded from backend</div>
        <pre className="previewBody">{JSON.stringify(lastLoaded, null, JSON_PRETTY_SPACES)}</pre>
      </div>
    </div>
  );
};
