import React, {memo, useCallback, useMemo, useState} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {API} from "./api.ts";
import {SavedBlocks} from "./types.ts";

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host = await YTApp.register();
const api = new API(host);

const DEFAULT_BLOCKS: SavedBlocks = {
  summaryChunks: [],
  preconditions: '',
  steps: [],
  additionalInfo: ''
};

function normalizeBlocks(value: SavedBlocks | null | undefined): SavedBlocks {
  return {
    summaryChunks: Array.isArray(value?.summaryChunks) ? value.summaryChunks : [],
    preconditions: value?.preconditions ?? '',
    steps: Array.isArray(value?.steps) ? value.steps : [],
    additionalInfo: value?.additionalInfo ?? ''
  };
}

const AppComponent: React.FunctionComponent = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [summaryChunksText, setSummaryChunksText] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [lastLoaded, setLastLoaded] = useState<SavedBlocks | null>(null);

  const collectedBlocks = useMemo<SavedBlocks>(() => {
    const summaryChunks = summaryChunksText
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    const steps = stepsText
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);

    return {
      summaryChunks,
      preconditions,
      steps,
      additionalInfo
    };
  }, [additionalInfo, preconditions, stepsText, summaryChunksText]);

  const load = useCallback(async () => {
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const result = normalizeBlocks(await api.getSavedBlocks());
      setLastLoaded(result);
      setSummaryChunksText(result.summaryChunks.join('\n'));
      setPreconditions(result.preconditions);
      setStepsText(result.steps.join('\n'));
      setAdditionalInfo(result.additionalInfo);
      setMessage('Loaded saved blocks.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      await api.setSavedBlocks(collectedBlocks);
      const refreshed = normalizeBlocks(await api.getSavedBlocks());
      setLastLoaded(refreshed);
      setSummaryChunksText(refreshed.summaryChunks.join('\n'));
      setPreconditions(refreshed.preconditions);
      setStepsText(refreshed.steps.join('\n'));
      setAdditionalInfo(refreshed.additionalInfo);
      setMessage('Saved and reloaded saved blocks.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [collectedBlocks]);

  const resetForm = useCallback(() => {
    setMessage(null);
    setError(null);
    setLastLoaded(null);
    setSummaryChunksText('');
    setPreconditions(DEFAULT_BLOCKS.preconditions);
    setStepsText('');
    setAdditionalInfo(DEFAULT_BLOCKS.additionalInfo);
  }, []);

  return (
    <div className="widget">
      <div className="actions">
        <Button primary disabled={loading || saving} onClick={load}>
          {loading ? 'Loading…' : 'Load saved blocks'}
        </Button>
        <Button primary disabled={loading || saving} onClick={save}>
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
            value={preconditions}
            onChange={e => setPreconditions(e.target.value)}
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

        <label className="field">
          <div className="fieldLabel">Additional info</div>
          <textarea
            className="fieldInput"
            value={additionalInfo}
            onChange={e => setAdditionalInfo(e.target.value)}
            rows={3}
          />
        </label>
      </div>

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

export const App = memo(AppComponent);
