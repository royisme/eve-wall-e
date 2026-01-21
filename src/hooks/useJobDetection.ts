import { useState, useEffect, useCallback } from "react";

interface DetectedJob {
  title: string;
  company: string;
  url: string;
}

interface SaveJobResult {
  success: boolean;
  error?: string;
}

export function useJobDetection() {
  const [detectedJob, setDetectedJob] = useState<DetectedJob | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Guard: Chrome extension APIs only available in extension context
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;

    const handleMessage = (message: { type: string; payload?: unknown }) => {
      if (message.type === "JOB_PAGE_DETECTED") {
        const payload = message.payload as { url: string; title: string };
        const titleParts = payload.title.split(" - ");
        setDetectedJob({
          title: titleParts[0] || "Job Position",
          company: titleParts[1] || "Company",
          url: payload.url,
        });
      }

      if (message.type === "NOTIFICATION") {
        const payload = message.payload as { message: string; notificationType: string };
        window.dispatchEvent(new CustomEvent("wall-e-toast", {
          detail: {
            type: payload.notificationType,
            message: payload.message,
            id: Date.now().toString(),
            timestamp: Date.now(),
          },
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const saveCurrentPage = useCallback(async (): Promise<SaveJobResult> => {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return { success: false, error: "Chrome API not available" };
    }

    setIsSaving(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        return { success: false, error: "No active tab" };
      }

      const response = await chrome.tabs.sendMessage(tab.id, { type: "SAVE_CURRENT_PAGE" });
      if (response?.success) {
        setDetectedJob(null);
      }
      return response || { success: false, error: "No response" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const dismissJob = useCallback(() => {
    setDetectedJob(null);
  }, []);

  return {
    detectedJob,
    isSaving,
    saveCurrentPage,
    dismissJob,
  };
}
