import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {API} from './api.ts';
import {LegacySavedBlocks, SavedBlocks} from './types.ts';


function normalizeBlocks(value: SavedBlocks | LegacySavedBlocks | null | undefined): SavedBlocks {
  if (value && typeof value === 'object' && Array.isArray((value as SavedBlocks).summary)) {
    const v = value as SavedBlocks;
    return {
      summary: Array.isArray(v.summary) ? v.summary : [],
      preconditions: Array.isArray(v.preconditions) ? v.preconditions : [],
      steps: Array.isArray(v.steps) ? v.steps : []
    };
  }

  const legacy = value as LegacySavedBlocks | null | undefined;
  return {
    summary: Array.isArray(legacy?.summaryChunks) ? legacy.summaryChunks : [],
    preconditions: legacy?.preconditions?.trim() ? [legacy.preconditions] : [],
    steps: Array.isArray(legacy?.steps) ? legacy.steps : []
  };
}

export const ApiPlayground: React.FunctionComponent = () => {
  const [api, setApi] = useState<API | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [summaryChunksText, setSummaryChunksText] = useState('');
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
    const summaryChunks = summaryChunksText
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
      summary: summaryChunks,
      preconditions,
      steps,
    };
  }, [preconditionsText, stepsText, summaryChunksText]);

  const load = useCallback(async () => {
    if (!api) {
      return;
    }

    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const result = normalizeBlocks(await api.getSavedBlocks());
      setLastLoaded(result);
      setSummaryChunksText(result.summary.join('\n'));
      setPreconditionsText(result.preconditions.join('\n'));
      setStepsText(result.steps.join('\n'));
      setMessage('Loaded saved blocks.');
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
      const refreshed = normalizeBlocks(await api.getSavedBlocks());
      setLastLoaded(refreshed);
      setSummaryChunksText(refreshed.summary.join('\n'));
      setPreconditionsText(refreshed.preconditions.join('\n'));
      setStepsText(refreshed.steps.join('\n'));
      setMessage('Saved and reloaded saved blocks.');
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
    setSummaryChunksText('');
    setPreconditionsText('');
    setStepsText('');
  }, []);

  return (
    <div className="apiPlayground">
      <div className="form">
        <label className="field">
          <div className="fieldLabel">Summary chunks</div>
          <textarea
            className="fieldInput"
            value={summaryChunksText}
            onChange={e => setSummaryChunksText(e.target.value)}
            rows={3}
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Preconditions</div>
          <textarea
            className="fieldInput"
            value={preconditionsText}
            onChange={e => setPreconditionsText(e.target.value)}
            rows={3}
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Steps (one per line)</div>
          <textarea
            className="fieldInput"
            value={stepsText}
            onChange={e => setStepsText(e.target.value)}
            rows={6}
          />
        </label>
      </div>

      <div className="actions">
        <Button primary disabled={!api || loading || saving} onClick={load}>
          {loading ? 'Loading…' : 'Load saved blocks'}
        </Button>
        <Button primary disabled={!api || loading || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save saved blocks'}
        </Button>
        <Button disabled={loading || saving} onClick={resetForm}>
          {'Reset form'}
        </Button>
      </div>

      {(message || error) && (
        <div className={error ? 'status statusError' : 'status statusOk'}>
          {error ?? message}
        </div>
      )}

      <div className="preview">
        <div className="previewTitle">Payload to save</div>
        <pre className="previewBody">{JSON.stringify(collectedBlocks, null, 2)}</pre>
      </div>

      <div className="preview">
        <div className="previewTitle">Last loaded from backend</div>
        <pre className="previewBody">{JSON.stringify(lastLoaded, null, 2)}</pre>
      </div>
    </div>
  );
};
