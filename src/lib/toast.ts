import { Toast, Toaster } from "@/components/ui/toaster";
import type { ToastType } from "@/components/ui/toast";
import type { SyncResult } from "@/lib/sync/types";

// Toast state management - imperative API that works from non-React code
let toastCallback: ((toast: ToastType, message: string) => void) | null = null;

export function setToastCallback(callback: ((toast: ToastType, message: string) => void) | null) {
  toastCallback = callback;
}

export function toast(type: ToastType, message: string): void {
  if (toastCallback) {
    toastCallback(type, message);
  } else {
    // Fallback: dispatch event
    window.dispatchEvent(new CustomEvent("wall-e-toast", {
      detail: { type, message },
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
    toastInfo(`${t("sync.success", { count: result.synced })}`);
  }
}
