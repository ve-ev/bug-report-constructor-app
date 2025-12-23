import React from 'react';

export type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

export const FieldComponent: React.FC<FieldProps> = ({label, htmlFor, children}) => {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? (
        <label className="text-[13px] font-semibold" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <div className="text-[13px] font-semibold">{label}</div>
      )}
      {children}
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
          ? `rounded-md border-2 border-dashed border-sky-400 bg-sky-50/30 ring-2 ring-sky-300/30${extra}`
          : `rounded-md border-2 border-dashed border-[var(--ring-borders-color)] bg-transparent${extra}`
      }
    >
      {children}
    </div>
  );
};
