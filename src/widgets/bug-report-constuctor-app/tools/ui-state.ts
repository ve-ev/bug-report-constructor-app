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
  const statusClassName = params.error ? 'status statusError' : 'status statusOk';
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
