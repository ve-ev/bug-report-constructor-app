import {createContext, useContext} from 'react';

import type {API} from '../api.ts';
import type {Project} from '../types.ts';
import type {TopPanelProps} from '../components/top-panel.tsx';
import type {BottomPanelProps} from '../components/bottom-panel.tsx';
import type {DraftUrlCustomField} from '../tools/draft-url.ts';

export type ConstructorStore = {
  api: API | null;

  selectedProjectId: string;
  setSelectedProjectId: (next: string) => void;

  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  draftIssueId: string | null;
  draftLoading: boolean;
  draftError: string | null;
  draftRevision: number;

  cleanupDraft: () => void;
  createDraftDisabled: boolean;
  onCreateDraft: () => void;
  setDraftUrlData: (data: {summary: string; description: string; customFields: DraftUrlCustomField[]}) => void;

  showPlayground: boolean;
  openPlayground: () => void;
  closePlayground: () => void;
  playgroundUnlocked: boolean;

  resetSignal: number;
  triggerReset: () => void;

  topPanelProps: TopPanelProps;
  bottomPanelProps: BottomPanelProps;
};

export const ConstructorStoreContext = createContext<ConstructorStore | null>(null);

export function useConstructorStore(): ConstructorStore {
  const ctx = useContext(ConstructorStoreContext);
  if (!ctx) {
    throw new Error('useConstructorStore must be used within ConstructorStoreProvider');
  }
  return ctx;
}
