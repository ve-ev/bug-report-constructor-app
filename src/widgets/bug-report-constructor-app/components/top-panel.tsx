import React, {useMemo} from 'react';

import type {Project} from '../types.ts';
import {TwButton} from './ui/tw-button.tsx';
import {TwSelect, type TwSelectItem} from './ui/tw-select.tsx';

export type TopPanelProps = {
  onResetForm: () => void;
  onOpenPlayground?: () => void;

  projectSelectDisabled: boolean;
  selectedProjectId: string;
  projects: Project[];
  projectsLoading: boolean;
  onSelectedProjectIdChange: (next: string) => void;

  projectsError: string | null;
};

export const TopPanel: React.FC<TopPanelProps> = props => {
  const {
    onResetForm,
    onOpenPlayground,
    projectSelectDisabled,
    selectedProjectId,
    projects,
    projectsLoading,
    onSelectedProjectIdChange,
    projectsError
  } = props;

  const projectsSelectItems = useMemo((): Array<TwSelectItem<string>> => {
    const base: Array<TwSelectItem<string>> = [];

    // Keep the placeholder text only as the closed control label (via `selectedLabel`).
    // Do not show a selectable placeholder option in the popup.
    if (!projectsLoading && !projects.length) {
      base.push({kind: 'item', value: '__no_projects__', label: 'No projects available', disabled: true});
      return base;
    }
    for (const p of projects) {
      base.push({kind: 'item', value: p.id, label: `${p.name} (${p.shortName})`});
    }
    return base;
  }, [projects, projectsLoading]);

  const selectedProjectLabel = useMemo(() => {
    if (!selectedProjectId) {
      return projectsLoading ? 'Loading projects…' : 'Select a project…';
    }
    const p = projects.find(x => x.id === selectedProjectId);
    return p ? `${p.name} (${p.shortName})` : 'Select a project…';
  }, [projects, projectsLoading, selectedProjectId]);

  return (
    <div className="bg-[var(--ring-content-background-color)] p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TwButton variant="secondary" onClick={onResetForm}>
            Reset form
          </TwButton>
          {onOpenPlayground ? (
            <TwButton variant="ghost" onClick={onOpenPlayground} title="Open API playground">
              API playground
            </TwButton>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <label htmlFor="projectSelect" className="shrink-0 text-[13px] font-semibold leading-5">
            Project
          </label>
          <TwSelect
            id="projectSelect"
            disabled={projectSelectDisabled}
            value={selectedProjectId}
            items={projectsSelectItems}
            selectedLabel={selectedProjectLabel}
            onChange={onSelectedProjectIdChange}
            className="w-[240px]"
          />
        </div>
      </div>

      {projectsError ? (
        <div className="mt-2 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] leading-5">
          {projectsError}
        </div>
      ) : null}
    </div>
  );
};
