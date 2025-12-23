import React, {useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';

import type {OutputFormatsPayload} from '../types.ts';
import type {OutputFormat} from '../tools/markdown.ts';
import {createId} from '../tools/id.ts';
import {FieldComponent} from './field-component.tsx';

type UpdateCustomFormatPatch = {
  name?: string;
  template?: string;
};

const DEFAULT_CUSTOM_TEMPLATE =
  '{{summary}}\n\n## Prerequisites\n{{preconditions_bullets}}\n\n## Steps\n{{steps_numbered}}\n\n## Expected\n{{expected}}\n\n## Actual\n{{actual}}\n\n## Additional info\n{{additionalInfo}}\n';

const PLACEHOLDERS = [
  '{{summary}}',
  '{{preconditions_bullets}}',
  '{{steps_numbered}}',
  '{{expected}}',
  '{{actual}}',
  '{{additionalInfo}}'
] as const;

type OutputFormatsFormProps = {
  outputFormat: OutputFormat;
  setOutputFormat: (id: OutputFormat) => void;
  outputFormats: OutputFormatsPayload;
  setOutputFormats: React.Dispatch<React.SetStateAction<OutputFormatsPayload>>;
  persistOutputFormats: (next: OutputFormatsPayload) => Promise<void> | void;
  loading: boolean;
  saving: boolean;
  error: string | null;
  message: string | null;
  showEditor: boolean;
  setShowEditor: React.Dispatch<React.SetStateAction<boolean>>;
};

const OutputFormatsSelect: React.FC<{
  outputFormat: OutputFormat;
  outputFormats: OutputFormatsPayload;
  loading: boolean;
  saving: boolean;
  onOutputFormatSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}> = props => {
  const {outputFormat, outputFormats, loading, saving, onOutputFormatSelectChange} = props;

  return (
    <select
      id="outputFormat"
      value={outputFormat}
      onChange={onOutputFormatSelectChange}
      disabled={loading || saving}
      className="min-w-0 flex-1 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-sky-400/60"
    >
      <option value="markdown_default">Default Markdown Template</option>
      {outputFormats.formats.length ? <option disabled>────────</option> : null}
      {outputFormats.formats.map(f => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
};

const OutputFormatsActions: React.FC<{
  loading: boolean;
  saving: boolean;
  showEditor: boolean;
  onToggleEditor: () => void;
  onAddCustomFormat: () => void;
  onSave: () => void;
}> = props => {
  const {loading, saving, showEditor, onToggleEditor, onAddCustomFormat, onSave} = props;

  return (
    <>
      <Button onClick={onToggleEditor} disabled={loading}>
        {showEditor ? 'Hide editor' : 'Edit / add'}
      </Button>

      {showEditor ? (
        <>
          <Button onClick={onAddCustomFormat} disabled={loading || saving}>
            Add custom format
          </Button>

          <Button onClick={onSave} disabled={loading || saving}>
            Save
          </Button>
        </>
      ) : null}
    </>
  );
};

const OutputFormatsToolbar: React.FC<{
  outputFormat: OutputFormat;
  outputFormats: OutputFormatsPayload;
  loading: boolean;
  saving: boolean;
  showEditor: boolean;
  error: string | null;
  message: string | null;
  onOutputFormatSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onToggleEditor: () => void;
  onAddCustomFormat: () => void;
  onSave: () => void;
}> = props => {
  const {
    outputFormat,
    outputFormats,
    loading,
    saving,
    showEditor,
    error,
    message,
    onOutputFormatSelectChange,
    onToggleEditor,
    onAddCustomFormat,
    onSave
  } = props;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <OutputFormatsSelect
          outputFormat={outputFormat}
          outputFormats={outputFormats}
          loading={loading}
          saving={saving}
          onOutputFormatSelectChange={onOutputFormatSelectChange}
        />

        <OutputFormatsActions
          loading={loading}
          saving={saving}
          showEditor={showEditor}
          onToggleEditor={onToggleEditor}
          onAddCustomFormat={onAddCustomFormat}
          onSave={onSave}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-900">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-[13px] text-green-900">{message}</div>
      ) : null}
    </>
  );
};

const CustomFormatsEditor: React.FC<{
  outputFormats: OutputFormatsPayload;
  onCustomFormatNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCustomFormatTemplateChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCustomFormatDeleteClick: (e: React.MouseEvent<HTMLElement>) => void;
}> = props => {
  const {outputFormats, onCustomFormatNameChange, onCustomFormatTemplateChange, onCustomFormatDeleteClick} = props;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
        Placeholders:{' '}
        {PLACEHOLDERS.map((p, idx) => (
          <React.Fragment key={p}>
            {idx ? ', ' : ''}
            {p}
          </React.Fragment>
        ))}
        .
      </div>

      {outputFormats.formats.length ? (
        <div className="flex flex-col gap-3">
          {outputFormats.formats.map(f => (
            <div
              key={f.id}
              className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  data-format-id={f.id}
                  value={f.name}
                  onChange={onCustomFormatNameChange}
                  className="min-w-0 flex-1 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-sky-400/60"
                />
                <Button data-format-id={f.id} onClick={onCustomFormatDeleteClick}>
                  Delete
                </Button>
              </div>
              <textarea
                rows={8}
                data-format-id={f.id}
                value={f.template}
                onChange={onCustomFormatTemplateChange}
                className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-sky-400/60"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
          No custom formats yet.
        </div>
      )}
    </div>
  );
};

export const OutputFormatsForm: React.FC<OutputFormatsFormProps> = props => {
  const {
    outputFormat,
    setOutputFormat,
    outputFormats,
    setOutputFormats,
    persistOutputFormats,
    loading,
    saving,
    error,
    message,
    showEditor,
    setShowEditor
  } = props;

  const onToggleEditor = useCallback(() => {
    setShowEditor(prev => !prev);
  }, [setShowEditor]);

  const onChangeOutputFormat = useCallback((next: string) => {
    setOutputFormat(next);
    persistOutputFormats({...outputFormats, activeFormat: next});
  }, [outputFormats, persistOutputFormats, setOutputFormat]);

  const onOutputFormatSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChangeOutputFormat(e.target.value);
    },
    [onChangeOutputFormat]
  );

  const onAddCustomFormat = useCallback(() => {
    const id = createId('fmt');
    const next: OutputFormatsPayload = {
      ...outputFormats,
      formats: [
        ...outputFormats.formats,
        {
          id,
          name: 'Custom format',
          template: DEFAULT_CUSTOM_TEMPLATE
        }
      ]
    };
    setOutputFormats(next);
    setOutputFormat(id);
  }, [outputFormats, setOutputFormat, setOutputFormats]);

  const onUpdateCustomFormat = useCallback((id: string, patch: UpdateCustomFormatPatch) => {
    setOutputFormats(prev => ({
      ...prev,
      formats: prev.formats.map(f => (f.id === id ? {...f, ...patch} : f))
    }));
  }, [setOutputFormats]);

  const onCustomFormatNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const id = e.currentTarget.dataset.formatId;
      if (!id) {
        return;
      }
      onUpdateCustomFormat(id, {name: e.currentTarget.value});
    },
    [onUpdateCustomFormat]
  );

  const onCustomFormatTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const id = e.currentTarget.dataset.formatId;
      if (!id) {
        return;
      }
      onUpdateCustomFormat(id, {template: e.currentTarget.value});
    },
    [onUpdateCustomFormat]
  );

  const onDeleteCustomFormat = useCallback((id: string) => {
    setOutputFormats(prev => ({
      ...prev,
      formats: prev.formats.filter(f => f.id !== id)
    }));

    if (outputFormat !== id) {
      return;
    }

    setOutputFormat('markdown_default');

    const next: OutputFormatsPayload = {
      ...outputFormats,
      activeFormat: 'markdown_default',
      formats: outputFormats.formats.filter(f => f.id !== id)
    };
    persistOutputFormats(next);
  }, [outputFormat, outputFormats, persistOutputFormats, setOutputFormat, setOutputFormats]);

  const onCustomFormatDeleteClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const id = (e.currentTarget as HTMLElement).dataset.formatId;
      if (!id) {
        return;
      }
      onDeleteCustomFormat(id);
    },
    [onDeleteCustomFormat]
  );

  const onSave = useCallback(() => {
    persistOutputFormats({...outputFormats, activeFormat: outputFormat});
  }, [outputFormat, outputFormats, persistOutputFormats]);

  return (
    <FieldComponent label="Output format" htmlFor="outputFormat">
      <div className="flex flex-col gap-2">
        <OutputFormatsToolbar
          outputFormat={outputFormat}
          outputFormats={outputFormats}
          loading={loading}
          saving={saving}
          showEditor={showEditor}
          error={error}
          message={message}
          onOutputFormatSelectChange={onOutputFormatSelectChange}
          onToggleEditor={onToggleEditor}
          onAddCustomFormat={onAddCustomFormat}
          onSave={onSave}
        />

        {showEditor ? (
          <CustomFormatsEditor
            outputFormats={outputFormats}
            onCustomFormatNameChange={onCustomFormatNameChange}
            onCustomFormatTemplateChange={onCustomFormatTemplateChange}
            onCustomFormatDeleteClick={onCustomFormatDeleteClick}
          />
        ) : null}
      </div>
    </FieldComponent>
  );
};
