import React, {useCallback, useMemo, useState} from 'react';
import {ChevronDownIcon, ChevronUpIcon, XMarkIcon} from '@heroicons/react/20/solid';

import {CustomField, SelectedCustomField} from '../../../types.ts';
import {TwButton} from '../../ui/tw-button.tsx';
import {TwSelect, type TwSelectItem} from '../../ui/tw-select.tsx';

export type CustomFieldsConstructorProps = {
  availableFields: CustomField[];
  selectedFields: SelectedCustomField[];
  onChangeSelectedFields: React.Dispatch<React.SetStateAction<SelectedCustomField[]>>;
  loading?: boolean;
  error?: string | null;
};

const CustomFieldsExpandedBody: React.FC<{
  options: CustomField[];
  placeholder: string;
  selectValue: string;
  onSelectChange: (next: string) => void;
  loading?: boolean;
  error?: string | null;
  selectedFieldEntities: {sel: SelectedCustomField; field: CustomField}[];
  onRemove: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
}> = ({
  options,
  placeholder,
  selectValue,
  onSelectChange,
  loading,
  error,
  selectedFieldEntities,
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
                <input
                  type="text"
                  value={sel.value}
                  onChange={e => onValueChange(sel.id, e.target.value)}
                  placeholder="Value (optional)"
                  className="w-full rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60"
                />
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
  availableFields,
  selectedFields,
  onChangeSelectedFields,
  loading,
  error
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectValue, setSelectValue] = useState('');

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
    (id: string, value: string) => {
      onChangeSelectedFields(prev => prev.map(x => (x.id === id ? {...x, value} : x)));
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
        return [...prev, {id, value: ''}];
      });
      setSelectValue('');
    },
    [onChangeSelectedFields]
  );

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
          onRemove={onRemove}
          onValueChange={onValueChange}
        />
      </div>
    </div>
  );
};
