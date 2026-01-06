import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

export type TwSelectItem<T extends string> =
  | {kind: 'separator'; id: string}
  | {kind: 'item'; value: T; label: string; disabled?: boolean};

export type TwSelectProps<T extends string> = {
  id: string;
  value: T;
  items: Array<TwSelectItem<T>>;
  disabled?: boolean;
  onChange: (next: T) => void;
  selectedLabel?: string;
  className?: string;
};

export function TwSelect<T extends string>(props: TwSelectProps<T>): React.ReactElement {
  const {id, value, items, disabled, onChange, selectedLabel, className} = props;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const resolvedLabel = useMemo(() => {
    if (selectedLabel !== undefined) {
      return selectedLabel;
    }
    const found = items.find(x => x.kind === 'item' && x.value === value);
    return found && found.kind === 'item' ? found.label : '';
  }, [items, selectedLabel, value]);

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
      const next = e.currentTarget.dataset.value as T | undefined;
      if (next === undefined) {
        return;
      }
      const isDisabled = e.currentTarget.dataset.disabled === 'true';
      if (isDisabled) {
        return;
      }
      close();
      onChange(next);
      buttonRef.current?.focus();
    },
    [close, onChange]
  );

  const resolveItemClass = useCallback(
    (item: Extract<TwSelectItem<T>, {kind: 'item'}>) => {
      if (item.disabled) {
        return 'w-full cursor-not-allowed rounded px-3 py-2 text-left text-[13px] leading-5 opacity-60';
      }
      if (item.value === value) {
        return 'w-full rounded px-3 py-2 text-left text-[13px] leading-5 bg-[rgba(236,72,153,0.12)]';
      }
      return 'w-full rounded px-3 py-2 text-left text-[13px] leading-5 hover:bg-[rgba(236,72,153,0.10)]';
    },
    [value]
  );

  return (
    <div ref={rootRef} className={(className ?? '') + ' relative min-w-0'}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--ring-borders-color)] bg-transparent px-3 py-2 text-left text-[13px] leading-5 outline-none focus:ring-2 focus:ring-pink-400/60 disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate">{resolvedLabel}</span>
        <span className="shrink-0 opacity-70" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-md border border-[var(--ring-borders-color)] bg-[var(--ring-content-background-color)] p-1 shadow-lg"
        >
          {items.map(item =>
            item.kind === 'separator' ? (
              <div key={item.id} className="my-1 border-t border-[var(--ring-borders-color)]"/>
            ) : (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={item.value === value}
                data-value={item.value}
                data-disabled={item.disabled ? 'true' : 'false'}
                onClick={onItemClick}
                className={resolveItemClass(item)}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
