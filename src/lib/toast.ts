import type { SyncResult } from "@/lib/sync/types";

type ToastType = "success" | "error" | "info";

// Toast state management - imperative API that works from non-React code
let toastCallback: ((type: ToastType, message: string) => void) | null = null;

export function setToastCallback(callback: ((type: ToastType, message: string) => void) | null) {
  toastCallback = callback;
}

export function toast(type: ToastType, message: string): void {
  if (toastCallback) {
    toastCallback(type, message);
  } else {
    // Fallback: dispatch event with unique id
    window.dispatchEvent(new CustomEvent("wall-e-toast", {
      detail: { id: crypto.randomUUID(), type, message, timestamp: Date.now() },
    }));
  }
}

export function toastSuccess(message: string): void {
  toast("success", message);
}

export function toastError(message: string): void {
  toast("error", message);
}

export function toastInfo(message: string): void {
  toast("info", message);
}

// Sync-specific toasts
export function toastSyncResult(result: SyncResult): void {
  if (result.error) {
    toastError(result.error);
  } else {
    toastInfo(`Synced ${result.synced} items`);
  }
}
