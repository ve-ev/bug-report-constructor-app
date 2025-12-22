import React from 'react';

export type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

export const FieldComponent: React.FC<FieldProps> = ({label, htmlFor, children}) => {
  return (
    <div className="field">
      {htmlFor ? (
        <label className="fieldLabel" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <div className="fieldLabel">{label}</div>
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
      className={isOver ? `fieldDropzone fieldDropzoneActive${extra}` : `fieldDropzone${extra}`}
    >
      {children}
    </div>
  );
};
