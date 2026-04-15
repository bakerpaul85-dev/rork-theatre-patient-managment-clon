// Simple callback bridge so FormsContext can trigger cloud sync 
// without importing CloudSyncContext (which would create a circular dep)
type SyncCallback = (form: any) => void;
type DeleteCallback = (formId: string) => void;

let syncCallback: SyncCallback | null = null;
let deleteCallback: DeleteCallback | null = null;

export const cloudSyncBridge = {
  onSync: (cb: SyncCallback) => { syncCallback = cb; },
  onDelete: (cb: DeleteCallback) => { deleteCallback = cb; },
  triggerSync: (form: any) => { if (syncCallback) syncCallback(form); },
  triggerDelete: (formId: string) => { if (deleteCallback) deleteCallback(formId); },
};
