import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {TwButton} from './components/ui/tw-button.tsx';
import {FieldComponent} from './components/ui/field-component.tsx';
import {Optional} from './components/ui/optional.tsx';
import {TwTextarea} from './components/ui/tw-textarea.tsx';
import {API} from './api.ts';
import {CustomField, DraftIssue, Project, SavedBlocks} from './types.ts';
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

function computeCanCallDraftApi(api: API | null, draftLoading: boolean): boolean {
  return Boolean(api) && !draftLoading;
}

function isSetProjectToDraftDisabled(params: {
  canCallDraftApi: boolean;
  draftIssueId: string;
  draftProjectId: string;
}): boolean {
  return !params.canCallDraftApi || !params.draftIssueId.trim() || !params.draftProjectId.trim();
}

function isGetDraftCustomFieldsDisabled(params: {canCallDraftApi: boolean; draftIssueId: string}): boolean {
  return !params.canCallDraftApi || !params.draftIssueId.trim();
}

export type ApiPlaygroundProps = {
  onClose?: () => void;
};

export const ApiPlayground: React.FunctionComponent<ApiPlaygroundProps> = ({onClose}) => {
  const [api, setApi] = useState<API | null>(null);

  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsMessage, setProjectsMessage] = useState<string | null>(null);
  const [lastUserProjects, setLastUserProjects] = useState<Project[] | null>(null);

  const [draftProjectId, setDraftProjectId] = useState('');
  const [draftIssueId, setDraftIssueId] = useState('');

  const [lastCreatedDraft, setLastCreatedDraft] = useState<DraftIssue | null>(null);
  const [lastSetProjectResult, setLastSetProjectResult] = useState<DraftIssue | null>(null);
  const [lastDraftFieldsResult, setLastDraftFieldsResult] = useState<CustomField[] | null>(null);

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

  const canCallDraftApi = computeCanCallDraftApi(api, draftLoading);

  const createDraft = useCallback(async () => {
    if (!api) {
      return;
    }
    const projectId = draftProjectId.trim();
    if (!projectId) {
      setDraftError('Project id is required');
      return;
    }
    setDraftMessage(null);
    setDraftError(null);
    setDraftLoading(true);
    try {
      const draft = await api.createDraft(projectId);
      setLastCreatedDraft(draft);
      setDraftIssueId(draft.id ?? '');
      setDraftMessage('Draft created with project');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDraftError(msg);
    } finally {
      setDraftLoading(false);
    }
  }, [api, draftProjectId]);

  const getUserProjects = useCallback(async () => {
    if (!api) {
      return;
    }
    setProjectsMessage(null);
    setProjectsError(null);
    setProjectsLoading(true);
    try {
      const projects = await api.getUserProjects();
      setLastUserProjects(projects);
      setProjectsMessage('User projects loaded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setProjectsError(msg);
    } finally {
      setProjectsLoading(false);
    }
  }, [api]);

  const setProjectToDraft = useCallback(async () => {
    if (!api) {
      return;
    }
    const issueId = draftIssueId.trim();
    const projectId = draftProjectId.trim();
    if (!issueId || !projectId) {
      setDraftError('Both Draft issue id and Project id are required');
      return;
    }
    setDraftMessage(null);
    setDraftError(null);
    setDraftLoading(true);
    try {
      const updated = await api.setProjectToDraft(issueId, projectId);
      setLastSetProjectResult(updated);
      setDraftMessage('Project set to draft');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDraftError(msg);
    } finally {
      setDraftLoading(false);
    }
  }, [api, draftIssueId, draftProjectId]);

  const getDraftCustomFields = useCallback(async () => {
    if (!api) {
      return;
    }
    const issueId = draftIssueId.trim();
    if (!issueId) {
      setDraftError('Draft issue id is required');
      return;
    }
    setDraftMessage(null);
    setDraftError(null);
    setDraftLoading(true);
    try {
      const fields = await api.getDraftCustomFields(issueId);
      setLastDraftFieldsResult(fields);
      setDraftMessage('Draft custom fields loaded');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDraftError(msg);
    } finally {
      setDraftLoading(false);
    }
  }, [api, draftIssueId]);

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

  const resetDraftForm = useCallback(() => {
    setDraftMessage(null);
    setDraftError(null);
    setDraftProjectId('');
    setDraftIssueId('');
    setLastCreatedDraft(null);
    setLastSetProjectResult(null);
    setLastDraftFieldsResult(null);
    setProjectsMessage(null);
    setProjectsError(null);
    setLastUserProjects(null);
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
      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] font-semibold">API playground</div>
        <Optional when={Boolean(onClose)}>
          <TwButton variant="secondary" onClick={onClose!} title="Back to constructor">
            Back
          </TwButton>
        </Optional>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[14px] font-semibold">YouTrack Draft API</div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FieldComponent label="Project id (admin/projects/{projectId})">
            <input
              type="text"
              value={draftProjectId}
              onChange={e => setDraftProjectId(e.target.value)}
              placeholder="e.g. 0-0"
              className="w-full rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
            />
          </FieldComponent>

          <FieldComponent label="Draft issue id (users/me/drafts/{issueId})">
            <input
              type="text"
              value={draftIssueId}
              onChange={e => setDraftIssueId(e.target.value)}
              placeholder="filled after Create Draft"
              className="w-full rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
            />
          </FieldComponent>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TwButton variant="primary" disabled={!canCallDraftApi} onClick={createDraft}>
            {draftLoading ? 'Creating…' : 'Create draft'}
          </TwButton>
          <TwButton
            variant="primary"
            disabled={isSetProjectToDraftDisabled({canCallDraftApi, draftIssueId, draftProjectId})}
            onClick={setProjectToDraft}
          >
            {draftLoading ? 'Saving…' : 'Set project to draft'}
          </TwButton>
          <TwButton
            variant="primary"
            disabled={isGetDraftCustomFieldsDisabled({canCallDraftApi, draftIssueId})}
            onClick={getDraftCustomFields}
          >
            {draftLoading ? 'Loading…' : 'Get draft custom fields'}
          </TwButton>

          <TwButton variant="secondary" disabled={!api || projectsLoading} onClick={getUserProjects}>
            {projectsLoading ? 'Loading…' : 'Get user projects'}
          </TwButton>
          <TwButton disabled={draftLoading} onClick={resetDraftForm}>
            Reset draft form
          </TwButton>
        </div>

        <Optional when={Boolean(draftError)}>
          <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] leading-5">{draftError}</div>
        </Optional>
        <Optional when={Boolean(draftMessage)}>
          <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5">
            {draftMessage}
          </div>
        </Optional>

        <Optional when={Boolean(projectsError)}>
          <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] leading-5">
            {projectsError}
          </div>
        </Optional>
        <Optional when={Boolean(projectsMessage)}>
          <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] leading-5">
            {projectsMessage}
          </div>
        </Optional>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-semibold">Last createDraft() response</div>
            <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
              {JSON.stringify(lastCreatedDraft, null, JSON_PRETTY_SPACES)}
            </pre>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-semibold">Last setProjectToDraft() response</div>
            <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
              {JSON.stringify(lastSetProjectResult, null, JSON_PRETTY_SPACES)}
            </pre>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-semibold">Last getDraftCustomFields() response</div>
            <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
              {JSON.stringify(lastDraftFieldsResult, null, JSON_PRETTY_SPACES)}
            </pre>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-semibold">Last getUserProjects() response</div>
            <pre className="m-0 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3 text-[12px] leading-[1.4]">
              {JSON.stringify(lastUserProjects, null, JSON_PRETTY_SPACES)}
            </pre>
          </div>

        </div>
      </div>

      <div className="border-t border-[var(--ring-borders-color)]"/>

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
