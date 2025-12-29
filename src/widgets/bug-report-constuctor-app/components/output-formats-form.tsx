import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon} from '@heroicons/react/20/solid';

import {TwButton} from './tw-button.tsx';

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
  onSelect: (next: OutputFormat) => void;
}> = props => {
  const {outputFormat, outputFormats, loading, saving, onSelect} = props;

  const disabled = loading || saving;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const items = useMemo(() => {
    const base: Array<{id: OutputFormat; label: string; kind: 'item' | 'separator'}> = [
      {id: 'markdown_default', label: 'Default Markdown Template', kind: 'item'}
    ];

    if (outputFormats.formats.length) {
      base.push({id: 'markdown_default', label: 'separator', kind: 'separator'});
    }

    for (const f of outputFormats.formats) {
      base.push({id: f.id as OutputFormat, label: f.name, kind: 'item'});
    }

    return base;
  }, [outputFormats.formats]);

  const selectedLabel = useMemo(() => {
    if (outputFormat === 'markdown_default') {
      return 'Default Markdown Template';
    }
    const found = outputFormats.formats.find(f => f.id === outputFormat);
    return found?.name ?? 'Default Markdown Template';
  }, [outputFormat, outputFormats.formats]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const onToggle = useCallback(() => {
    if (disabled) {
      return;
    }
    setOpen(v => !v);
  }, [disabled]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
      if (e.key === 'ArrowDown' && !open) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [close, disabled, open]
  );

  useEffect(() => {
    if (!open) {
      return () => {
        // no-op
      };
    }

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      if (e.target instanceof Node && root.contains(e.target)) {
        return;
      }
      close();
    };

    window.addEventListener('pointerdown', onPointerDown, {capture: true});
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, {capture: true});
    };
  }, [close, open]);

  const onItemClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const next = e.currentTarget.dataset.value as OutputFormat | undefined;
      if (!next) {
        return;
      }
      close();
      onSelect(next);
      buttonRef.current?.focus();
    },
    [close, onSelect]
  );

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        id="outputFormat"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-left text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60 disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <span className="shrink-0 opacity-70" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby="outputFormat"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-1 shadow-lg"
        >
          {items.map(item =>
            item.kind === 'separator' ? (
              <div key="separator" className="my-1 border-t border-[var(--ring-borders-color)]"/>
            ) : (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === outputFormat}
                data-value={item.id}
                onClick={onItemClick}
                className={
                  item.id === outputFormat
                    ? 'w-full rounded px-3 py-2 text-left text-[13px] leading-5 bg-[rgba(236,72,153,0.12)]'
                    : 'w-full rounded px-3 py-2 text-left text-[13px] leading-5 hover:bg-[rgba(236,72,153,0.10)]'
                }
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
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

  return showEditor ? (
    <>
      <TwButton
        onClick={onAddCustomFormat}
        disabled={loading || saving}
        aria-label="Add custom format"
        title="Add custom format"
      >
        <PlusIcon className="h-4 w-4"/>
      </TwButton>

      <TwButton variant="primary" onClick={onSave} disabled={loading || saving}>
        Save
      </TwButton>

      <TwButton onClick={onToggleEditor} disabled={loading} aria-label="Hide editor" title="Hide editor">
        <XMarkIcon className="h-4 w-4"/>
      </TwButton>
    </>
  ) : (
    <TwButton onClick={onToggleEditor} disabled={loading} aria-label="Edit / add" title="Edit / add">
      <PencilSquareIcon className="h-4 w-4"/>
    </TwButton>
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
  onSelectOutputFormat: (next: OutputFormat) => void;
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
    onSelectOutputFormat,
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
          onSelect={onSelectOutputFormat}
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
      <div className="rounded-md border border-pink-400/40 bg-[rgba(236,72,153,0.08)] px-3 py-2 text-[13px] text-[var(--ring-text-color)]">
        <span className="font-semibold">Placeholders:</span>{' '}
        {PLACEHOLDERS.map((p, idx) => (
          <React.Fragment key={p}>
            {idx ? ', ' : ''}
            <span className="font-mono">{p}</span>
          </React.Fragment>
        ))}
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
                  className="min-w-0 flex-1 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                />
                <TwButton
                  size="xs"
                  variant="dangerGhost"
                  data-format-id={f.id}
                  onClick={onCustomFormatDeleteClick}
                  aria-label="Delete custom format"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4"/>
                </TwButton>
              </div>
              <textarea
                rows={8}
                data-format-id={f.id}
                value={f.template}
                onChange={onCustomFormatTemplateChange}
                className="w-full resize-y rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] px-3 py-2 text-[13px] opacity-70">
          No custom formats yet
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

  const onChangeOutputFormat = useCallback((next: OutputFormat) => {
    setOutputFormat(next);
    persistOutputFormats({...outputFormats, activeFormat: next});
  }, [outputFormats, persistOutputFormats, setOutputFormat]);

  const onSelectOutputFormat = useCallback(
    (next: OutputFormat) => {
      onChangeOutputFormat(next);
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
          onSelectOutputFormat={onSelectOutputFormat}
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
