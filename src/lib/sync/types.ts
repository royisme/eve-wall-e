export type ActionRecord = {
  id: string;
  type: "CREATE_JOB" | "UPDATE_JOB" | "DELETE_JOB" | "UPDATE_RESUME" | "UPDATE_TAILORED";
  payload: unknown;
  createdAt: Date;
  status: "pending" | "syncing" | "failed";
  retryCount: number;
};

export type QueuedAction = Omit<ActionRecord, "id">;

export type SyncResult = {
  success: boolean;
  synced: number;
  error?: string;
};

export type SyncContext = {
  isOnline: boolean;
  lastSyncTime?: Date;
};

export type SyncProgressCallback = (synced: number, total: number) => void;
