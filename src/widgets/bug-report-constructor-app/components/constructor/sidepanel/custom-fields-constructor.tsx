import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ChevronDownIcon, ChevronUpIcon, XMarkIcon} from '@heroicons/react/20/solid';

import type {API} from '../../../api.ts';
import {CustomField, CustomFieldPossibleValue, SelectedCustomField} from '../../../types.ts';
import {TwButton} from '../../ui/tw-button.tsx';
import {TwSelect, type TwSelectItem} from '../../ui/tw-select.tsx';

export type CustomFieldsConstructorProps = {
  api: API | null;
  draftIssueId: string | null;
  availableFields: CustomField[];
  selectedFields: SelectedCustomField[];
  onChangeSelectedFields: React.Dispatch<React.SetStateAction<SelectedCustomField[]>>;
  loading?: boolean;
  error?: string | null;
};

type FieldValuesState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'loaded'; values: CustomFieldPossibleValue[]}
  | {status: 'error'; error: string};

const CF_TYPES_WITH_POSSIBLE_VALUES = new Set<string>([
  'SingleEnumIssueCustomField',
  'SingleUserIssueCustomField',
  'SingleOwnedIssueCustomField',
  'SingleBuildIssueCustomField',
  'StateIssueCustomField'
]);

function isFieldWithPossibleValues(field: CustomField): boolean {
  return Boolean(field.type && CF_TYPES_WITH_POSSIBLE_VALUES.has(field.type));
}

function shouldStartLoadingPossibleValues(state: FieldValuesState | undefined): boolean {
  return !state || state.status === 'idle' || state.status === 'error';
}

function PossibleValueSelector({
  fieldId,
  valueId,
  placeholder,
  state,
  onChange
}: {
  fieldId: string;
  valueId: string;
  placeholder: string;
  state: FieldValuesState;
  onChange: (id: string, name: string) => void;
}): React.JSX.Element {
  const items = useMemo((): Array<TwSelectItem<string>> => {
    if (state.status === 'loading' || state.status === 'idle') {
      return [{kind: 'item', value: '__loading__', label: 'Loading…', disabled: true}];
    }
    if (state.status === 'error') {
      return [{kind: 'item', value: '__error__', label: 'Failed to load values', disabled: true}];
    }
    if (!state.values.length) {
      return [{kind: 'item', value: '__no_values__', label: 'No values', disabled: true}];
    }
    return state.values.map(v => ({kind: 'item', value: v.id, label: v.name}));
  }, [state]);

  const selectedLabel = useMemo(() => {
    if (!valueId) {
      return placeholder;
    }
    const found = items.find(x => x.kind === 'item' && x.value === valueId);
    return found && found.kind === 'item' ? found.label : placeholder;
  }, [items, placeholder, valueId]);

  const onSelect = useCallback(
    (nextId: string) => {
      if (!nextId) {
        onChange('', '');
        return;
      }
      const found = items.find(x => x.kind === 'item' && x.value === nextId);
      const name = found && found.kind === 'item' ? found.label : '';
      onChange(nextId, name);
    },
    [items, onChange]
  );

  return (
    <div className="flex flex-col gap-1">
      <TwSelect
        id={`customField-${fieldId}`}
        disabled={state.status === 'loading' || state.status === 'idle' || state.status === 'error'}
        value={valueId}
        items={items}
        selectedLabel={selectedLabel}
        onChange={onSelect}
        className="min-w-[180px] w-full"
      />
      {state.status === 'error' ? (
        <div className="text-[12px] leading-4 text-red-300/90">{state.error}</div>
      ) : null}
    </div>
  );
}

const CustomFieldsExpandedBody: React.FC<{
  options: CustomField[];
  placeholder: string;
  selectValue: string;
  onSelectChange: (next: string) => void;
  loading?: boolean;
  error?: string | null;
  selectedFieldEntities: {sel: SelectedCustomField; field: CustomField}[];
  possibleValuesByFieldId: Record<string, FieldValuesState>;
  onRemove: (id: string) => void;
  onValueChange: (id: string, value: string, valueId?: string) => void;
}> = ({
  options,
  placeholder,
  selectValue,
  onSelectChange,
  loading,
  error,
  selectedFieldEntities,
  possibleValuesByFieldId,
  onRemove,
  onValueChange
}) => {
  const items = useMemo((): Array<TwSelectItem<string>> => {
    if (loading && !options.length) {
      return [{kind: 'item', value: '__loading__', label: 'Loading…', disabled: true}];
    }
    if (!options.length) {
      return [{kind: 'item', value: '__no_fields__', label: 'No fields available', disabled: true}];
    }
    return options.map(f => ({kind: 'item', value: f.id, label: f.name}));
  }, [loading, options]);

  const selectedLabel = useMemo(() => {
    if (!selectValue) {
      return placeholder;
    }
    const found = items.find(x => x.kind === 'item' && x.value === selectValue);
    return found && found.kind === 'item' ? found.label : placeholder;
  }, [items, placeholder, selectValue]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TwSelect
          id="customFields"
          disabled={Boolean(loading) || !options.length}
          value={selectValue}
          items={items}
          selectedLabel={selectedLabel}
          onChange={onSelectChange}
          className="min-w-[180px] flex-1"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] leading-5">{error}</div>
      ) : null}

      {selectedFieldEntities.length ? (
        <div className="flex flex-col gap-2">
          {selectedFieldEntities.map(({sel, field}) => (
            <div
              key={sel.id}
              className="rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5">{field.name}</div>
                <TwButton
                  size="xs"
                  variant="dangerGhost"
                  onClick={() => onRemove(sel.id)}
                  aria-label="Remove custom field"
                  title="Remove"
                >
                  <XMarkIcon className="h-4 w-4"/>
                </TwButton>
              </div>

              <div className="mt-2">
                {isFieldWithPossibleValues(field) ? (
                  <PossibleValueSelector
                    fieldId={field.id}
                    valueId={sel.valueId ?? ''}
                    placeholder="Select a value"
                    state={possibleValuesByFieldId[field.id] ?? {status: 'idle'}}
                    onChange={(nextId, nextName) => onValueChange(sel.id, nextName, nextId)}
                  />
                ) : (
                  <input
                    type="text"
                    value={sel.value}
                    onChange={e => onValueChange(sel.id, e.target.value)}
                    placeholder="Type a value"
                    className="w-full rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-[var(--ring-border-accent-color)]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[13px] opacity-70">No custom fields added yet.</div>
      )}
    </div>
  );
};

export const CustomFieldsConstructor: React.FC<CustomFieldsConstructorProps> = ({
  api,
  draftIssueId,
  availableFields,
  selectedFields,
  onChangeSelectedFields,
  loading,
  error
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const [selectValue, setSelectValue] = useState('');

  const [possibleValuesByFieldId, setPossibleValuesByFieldId] = useState<Record<string, FieldValuesState>>({});

  const options = useMemo(() => {
    const selected = new Set(selectedFields.map(x => x.id));
    return availableFields.filter(f => !selected.has(f.id));
  }, [availableFields, selectedFields]);

  const selectedFieldEntities = useMemo(() => {
    const byId = new Map(availableFields.map(f => [f.id, f] as const));
    return selectedFields
      .map(sel => ({sel, field: byId.get(sel.id)}))
      .filter(x => Boolean(x.field)) as {sel: SelectedCustomField; field: CustomField}[];
  }, [availableFields, selectedFields]);

  const onRemove = useCallback(
    (id: string) => {
      onChangeSelectedFields(prev => prev.filter(x => x.id !== id));
    },
    [onChangeSelectedFields]
  );

  const onValueChange = useCallback(
    (id: string, value: string, valueId?: string) => {
      onChangeSelectedFields(prev => prev.map(x => (x.id === id ? {...x, value, valueId} : x)));
    },
    [onChangeSelectedFields]
  );

  const onSelectChange = useCallback(
    (id: string) => {
      if (!id) {
        return;
      }
      onChangeSelectedFields(prev => {
        if (prev.some(x => x.id === id)) {
          return prev;
        }
        return [...prev, {id, value: '', valueId: ''}];
      });
      setSelectValue('');
    },
    [onChangeSelectedFields]
  );

  useEffect(() => {
    if (!api || !draftIssueId) {
      setPossibleValuesByFieldId({});
      return;
    }

    const toLoad = selectedFieldEntities
      .map(x => x.field)
      .filter(isFieldWithPossibleValues)
      .filter(field => shouldStartLoadingPossibleValues(possibleValuesByFieldId[field.id]));

    for (const field of toLoad) {
      setPossibleValuesByFieldId(prev => ({...prev, [field.id]: {status: 'loading'}}));
      api
        .getCFPossibleValues(draftIssueId, field.id)
        .then(values => {
          setPossibleValuesByFieldId(prev => ({...prev, [field.id]: {status: 'loaded', values}}));
        })
        .catch(e => {
          const msg = e instanceof Error ? e.message : String(e);
          setPossibleValuesByFieldId(prev => ({...prev, [field.id]: {status: 'error', error: msg}}));
        });
    }
  }, [api, draftIssueId, possibleValuesByFieldId, selectedFieldEntities]);

  const placeholder = useMemo(() => {
    if (loading) {
      return 'Loading…';
    }
    if (options.length) {
      return 'Add a field…';
    }
    return 'No fields available';
  }, [loading, options.length]);

  const onToggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex items-center justify-between gap-3 text-left text-[13px] font-semibold leading-5"
        onClick={onToggleCollapsed}
        aria-label="Toggle custom fields"
        aria-expanded={!collapsed}
        title="Toggle"
      >
        <span>Custom fields</span>
        <span className="shrink-0">
          <ChevronUpIcon className={'h-4 w-4' + (collapsed ? ' hidden' : '')}/>
          <ChevronDownIcon className={'h-4 w-4' + (collapsed ? '' : ' hidden')}/>
        </span>
      </button>

      <div className={collapsed ? 'hidden' : ''}>
        <CustomFieldsExpandedBody
          options={options}
          placeholder={placeholder}
          selectValue={selectValue}
          onSelectChange={onSelectChange}
          loading={loading}
          error={error}
          selectedFieldEntities={selectedFieldEntities}
          possibleValuesByFieldId={possibleValuesByFieldId}
          onRemove={onRemove}
          onValueChange={onValueChange}
        />
      </div>
    </div>
  );
};
