import { queueAction, getAllActions, updateActionStatus, incrementRetryCount, removeAction, clearActionQueue } from "./actionQueue";
import { getAllJobs, saveJobs } from "@/lib/db";
import { eveApi } from "@/lib/api";
import type { QueuedAction, SyncProgressCallback } from "./types";

const SYNC_INTERVAL = 60000; // 1 minute
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
      if (action.status !== "pending") continue;

      try {
        await this.executeAction(action);
        synced++;
        await removeAction(action.id);
      } catch (error) {
        console.error(`[Sync] Action ${action.id} failed:`, error);

        if (action.retryCount >= MAX_RETRIES) {
          // Max retries reached, remove and log
          console.error(`[Sync] Action ${action.id} failed after ${MAX_RETRIES} retries, removing`);
          await removeAction(action.id);
        } else {
          // Increment retry count
          await incrementRetryCount(action.id);
        }
      }
    }

    this.isProcessing = false;
    return { success: true, synced };
  }

  private async executeAction(action: QueuedAction): Promise<void> {
    // Update status to syncing
    await updateActionStatus(action.id, "syncing");

    try {
      switch (action.type) {
        case "CREATE_JOB":
          // Fetch latest jobs from server and save
          await this.syncJobsFromServer();
          break;

        case "UPDATE_JOB":
          // Push update to server
          await this.pushJobUpdate(action.payload);
          break;

        case "DELETE_JOB":
          // Skip job (status change on server)
          await this.pushJobDelete(action.payload);
          break;

        case "UPDATE_RESUME":
          // Resume updates are sync-only, just mark as synced
          // TODO: Implement if needed
          break;

        case "UPDATE_TAILORED":
          // Tailored resume sync-only
          // TODO: Implement if needed
          break;

        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }

      // Mark as completed
      await updateActionStatus(action.id, "pending"); // Reset to pending for potential re-queue
    } catch (error) {
      // Mark as failed with retry count
      await updateActionStatus(action.id, "failed");
      await incrementRetryCount(action.id);
      throw error;
    }
  }

  private async syncJobsFromServer(): Promise<void> {
    const { jobs } = await eveApi.getJobs({ limit: 200 });
    await saveJobs(jobs);
    console.log(`[Sync] Synced ${jobs.length} jobs from server`);
  }

  private async pushJobUpdate(payload: unknown): Promise<void> {
    // Parse jobId from payload
    const jobId = (payload as any)?.id;
    if (!jobId) throw new Error("Invalid job update payload");
    await eveApi.updateJob(jobId, payload as any);
  }

  private async pushJobDelete(payload: unknown): Promise<void> {
    const jobId = (payload as any)?.id;
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

    // Store interval ID for cleanup (not exported for now)
    (this as any).syncIntervalId = intervalId;
  }

  public stopAutoSync(): void {
    if ((this as any).syncIntervalId) {
      clearInterval((this as any).syncIntervalId);
    }
  }
}

// Singleton instance
export const syncService = new SyncService();
