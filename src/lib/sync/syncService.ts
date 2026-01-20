import { getAllActions, updateActionStatus, incrementRetryCount, removeAction, saveJobs } from "@/lib/db";
import { eveApi } from "@/lib/api";
import type { JobStatus } from "@/lib/api";
import type { ActionRecord } from "@/lib/db/schema";
import type { SyncProgressCallback } from "./types";

const SYNC_INTERVAL = 60000;
const MAX_RETRIES = 3;

export class SyncService {
  private isProcessing = false;
  private progressCallback?: SyncProgressCallback;

  setProgressCallback(callback: SyncProgressCallback) {
    this.progressCallback = callback;
  }

  async processQueue(isOnline: boolean): Promise<{ success: boolean; synced: number; error?: string }> {
    if (this.isProcessing || !isOnline) {
      return { success: false, synced: 0 };
    }

    this.isProcessing = true;
    const actions = await getAllActions();
    let synced = 0;

    for (const action of actions) {
      if (action.status !== "pending" || action.id === undefined) continue;

      try {
        await this.executeAction(action as ActionRecord & { id: number });
        synced++;
        await removeAction(action.id);
      } catch (error) {
        console.error(`[Sync] Action ${action.id} failed:`, error);

        if (action.retryCount >= MAX_RETRIES) {
          console.error(`[Sync] Action ${action.id} failed after ${MAX_RETRIES} retries, removing`);
          await removeAction(action.id);
        } else {
          await incrementRetryCount(action.id);
        }
      }
    }

    this.isProcessing = false;
    return { success: true, synced };
  }

  private async executeAction(action: ActionRecord & { id: number }): Promise<void> {
    await updateActionStatus(action.id, "syncing");

    try {
      switch (action.type) {
        case "createJob":
          await this.syncJobsFromServer();
          break;

        case "updateJob":
          await this.pushJobUpdate(action.payload);
          break;

        case "deleteJob":
          await this.pushJobDelete(action.payload);
          break;

        case "updateResume":
        case "tailorResume":
          break;

        default:
          throw new Error(`Unknown action type: ${(action as ActionRecord).type}`);
      }

      await removeAction(action.id);
    } catch (error) {
      await updateActionStatus(action.id, "failed");
      throw error;
    }
  }

  private async syncJobsFromServer(): Promise<void> {
    const { jobs } = await eveApi.getJobs({ limit: 200 });
    await saveJobs(jobs);
    console.log(`[Sync] Synced ${jobs.length} jobs from server`);
  }

  private async pushJobUpdate(payload: unknown): Promise<void> {
    const jobId = (payload as { id?: number })?.id;
    if (!jobId) throw new Error("Invalid job update payload");
    await eveApi.updateJob(jobId, payload as { status?: JobStatus; starred?: boolean });
  }

  private async pushJobDelete(payload: unknown): Promise<void> {
    const jobId = (payload as { id?: number })?.id;
    if (!jobId) throw new Error("Invalid job delete payload");
    await eveApi.updateJob(jobId, { status: "skipped" });
  }

  public startAutoSync(): void {
    const intervalId = setInterval(async () => {
      if (navigator.onLine) {
        const result = await this.processQueue(true);
        if (this.progressCallback) {
          this.progressCallback(result.synced, 0);
        }
      }
    }, SYNC_INTERVAL);

    (this as { syncIntervalId?: ReturnType<typeof setInterval> }).syncIntervalId = intervalId;
  }

  public stopAutoSync(): void {
    const self = this as { syncIntervalId?: ReturnType<typeof setInterval> };
    if (self.syncIntervalId) {
      clearInterval(self.syncIntervalId);
    }
  }
}

export const syncService = new SyncService();
