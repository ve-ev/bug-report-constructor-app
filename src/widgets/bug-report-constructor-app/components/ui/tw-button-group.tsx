import React, {useCallback} from 'react';

import {cx} from '../../utils/tw-utils.ts';

export interface TwButtonGroupItem<T extends string> {
  id: T;
  label: string;
}

export interface TwButtonGroupProps<T extends string> {
  items: Array<TwButtonGroupItem<T>>;
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
  className?: string;
}

export function TwButtonGroup<T extends string>(props: TwButtonGroupProps<T>) {
  const {items, value, onChange, disabled, className} = props;

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id as T | undefined;
      if (!id) {
        return;
      }
      onChange(id);
    },
    [onChange]
  );

  return (
    <div className={cx('inline-flex overflow-hidden rounded-md border border-[var(--ring-borders-color)]', className)}>
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            data-id={item.id}
            onClick={onClick}
            disabled={disabled}
            className={cx(
              'px-3 py-1.5 text-[13px] leading-5 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring-border-accent-color)] disabled:opacity-50',
              active
                ? 'bg-[var(--ring-main-color)] text-[var(--ring-white-text-color)]'
                : 'bg-[var(--ring-content-background-color)] text-[var(--ring-text-color)] hover:bg-[color-mix(in_srgb,var(--ring-main-color)_10%,transparent)]'
            )}
            aria-pressed={active}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
