import React, {useCallback, useMemo, useState} from 'react';

import {ChevronDownIcon, ChevronUpIcon} from '@heroicons/react/20/solid';

export type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
};

export const FieldComponent: React.FC<FieldProps> = ({
  label,
  htmlFor,
  children,
  collapsible,
  defaultCollapsed,
  actions
}) => {
  const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed));

  const onToggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const title = useMemo(() => {
    if (!collapsible) {
      return (
        <div className="flex items-center justify-between gap-3">
          {htmlFor ? (
            <label className="text-[13px] font-semibold" htmlFor={htmlFor}>
              {label}
            </label>
          ) : (
            <div className="text-[13px] font-semibold">{label}</div>
          )}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left text-[13px] font-semibold"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          title="Toggle"
        >
          <span className="min-w-0">{label}</span>
          <span className="shrink-0">
            <ChevronUpIcon className={'h-4 w-4' + (collapsed ? ' hidden' : '')}/>
            <ChevronDownIcon className={'h-4 w-4' + (collapsed ? '' : ' hidden')}/>
          </span>
        </button>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    );
  }, [actions, collapsible, collapsed, htmlFor, label, onToggleCollapsed]);

  return (
    <div className="flex flex-col gap-3">
      {title}
      <div className={collapsible && collapsed ? 'hidden' : ''}>{children}</div>
    </div>
  );
};

export type FieldDropzoneProps = {
  isOver: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  className?: string;
  children: React.ReactNode;
};

export const FieldDropzone: React.FC<FieldDropzoneProps> = ({isOver, setNodeRef, className, children}) => {
  const extra = className ? ` ${className}` : '';
  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? `rounded-md border-2 border-dashed border-[var(--ring-main-color)] bg-[color-mix(in_srgb,var(--ring-main-color)_8%,transparent)]${extra}`
          : `rounded-md border-2 border-dashed border-[var(--ring-borders-color)] bg-transparent${extra}`
      }
    >
      {children}
    </div>
  );
};
