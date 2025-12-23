export type StatusState = {
  showStatus: boolean;
  statusClassName: string;
  statusText: string | null;
};

export type LoadSaveTitles = {
  loadTitle: string;
  saveTitle: string;
};

export function computeIsBusy(loading: boolean, saving: boolean): boolean {
  return loading || saving;
}

export function computeStatus(params: {message: string | null; error: string | null}): StatusState {
  const showStatus = !!(params.message || params.error);
  const statusClassName = params.error
    ? 'rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-900'
    : 'rounded-md border border-green-300 bg-green-50 px-3 py-2 text-[13px] text-green-900';
  const statusText = params.error ?? params.message;
  return {showStatus, statusClassName, statusText};
}

export function computeLoadSaveTitles(params: {
  loading: boolean;
  saving: boolean;
  loadIdleTitle: string;
  saveIdleTitle: string;
}): LoadSaveTitles {
  return {
    loadTitle: params.loading ? 'Loading…' : params.loadIdleTitle,
    saveTitle: params.saving ? 'Saving…' : params.saveIdleTitle
  };
}
