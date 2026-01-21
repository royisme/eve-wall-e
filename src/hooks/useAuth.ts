import { useState, useEffect, useCallback } from "react";
import { getServerUrl, verifyConnection, clearConfig } from "@/lib/auth";

export type AuthStatus =
  | "loading"       // Initial check in progress
  | "not_configured" // No server URL configured
  | "validating"    // Verifying connection
  | "authenticated" // Connected to Eve
  | "offline"       // Eve server not reachable
  | "error";        // Unexpected error

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [serverUrl, setServerUrlState] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setStatus("loading");
    try {
      const url = await getServerUrl();
      
      if (!url) {
        setStatus("not_configured");
        setServerUrlState(null);
        return;
      }

      setStatus("validating");
      setServerUrlState(url);

      const result = await verifyConnection(url);

      if (result.ok) {
        setStatus("authenticated");
      } else {
        setStatus("offline");
      }
    } catch (error) {
      console.error("[useAuth] Error checking auth:", error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const retry = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  const clearAndRestart = useCallback(async () => {
    await clearConfig();
    setStatus("not_configured");
    setServerUrlState(null);
  }, []);

  const setAuthenticated = useCallback((url: string) => {
    setStatus("authenticated");
    setServerUrlState(url);
  }, []);

  return {
    status,
    serverUrl,
    retry,
    clearAndRestart,
    setAuthenticated,
  };
}
