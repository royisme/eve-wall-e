import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "online" | "offline" | "reconnecting";

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [lastChecked, setLastChecked] = useState(Date.now());
  const intervalRef = useRef<number | null>(null);
  const checkTimeoutRef = useRef<number | null>(null);

  const checkConnection = useCallback(async () => {
    // Don't check if a check is already in progress
    if (checkTimeoutRef.current) return;

    try {
      checkTimeoutRef.current = window.setTimeout(() => {
        checkTimeoutRef.current = null;
      }, 5000);

      // Check network availability
      const isOnline = navigator.onLine;

      // Also verify by pinging Eve backend
      let eveReachable = isOnline;
      if (isOnline) {
        try {
          const { serverPort } = await new Promise<{ serverPort?: string }>((resolve) => {
            if (typeof chrome !== "undefined" && chrome.storage) {
              chrome.storage.local.get(["serverPort"], resolve);
            } else {
              resolve({ serverPort: "3033" });
            }
          });

          const response = await fetch(`http://localhost:${serverPort}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          }).catch(() => ({ ok: false }));

          eveReachable = response.ok;
        } catch {
          // If fetch fails, still consider online if navigator says so
        }
      }

      setLastChecked(Date.now());
      setStatus(
        !isOnline || !eveReachable ? "offline" :
        eveReachable ? "online" :
        "reconnecting"
      );
    } catch (error) {
      console.error("[ConnectionStatus] Check failed:", error);
      setStatus("offline");
      setLastChecked(Date.now());
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkConnection();

    // Set up interval for periodic checks
    const intervalId = window.setInterval(() => {
      // Only check if not currently checking (from explicit timeout)
      if (!checkTimeoutRef.current) {
        checkConnection();
      }
    }, 30000); // Every 30 seconds

    intervalRef.current = intervalId;

    // Listen for browser online/offline events
    const handleOnline = () => {
      setStatus("online");
      checkConnection();
    };

    const handleOffline = () => {
      setStatus("offline");
      checkConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  // Manual check function for refresh
  const checkNow = useCallback(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    status,
    lastChecked,
    checkNow,
  };
}
