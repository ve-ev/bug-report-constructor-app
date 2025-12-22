import React from 'react';

export type IssueFieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
};

export const IssueField: React.FC<IssueFieldProps> = ({label, htmlFor, children}) => {
  return (
    <div className="issueField">
      {htmlFor ? (
        <label className="issueFieldLabel" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <div className="issueFieldLabel">{label}</div>
      )}
      {children}
    </div>
  );
};

export type IssueDropzoneProps = {
  isOver: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  className?: string;
  children: React.ReactNode;
};

export const IssueDropzone: React.FC<IssueDropzoneProps> = ({isOver, setNodeRef, className, children}) => {
  const extra = className ? ` ${className}` : '';
  return (
    <div
      ref={setNodeRef}
      className={isOver ? `issueDropzone issueDropzoneActive${extra}` : `issueDropzone${extra}`}
    >
      {children}
    </div>
  );
};
