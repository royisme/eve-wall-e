import { useState, useEffect, useCallback } from "react";
import { getStoredAuth, verifyToken, clearAuth } from "@/lib/auth";

export type AuthStatus =
  | "loading"       // Initial check in progress
  | "not_paired"    // No token, needs onboarding
  | "validating"    // Verifying existing token
  | "authenticated" // Token is valid, can use app
  | "invalid"       // Token expired or invalid, needs reconnect
  | "error";        // Unexpected error

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setStatus("loading");
    try {
      const auth = await getStoredAuth();

      if (!auth || !auth.token) {
        setStatus("not_paired");
        setServerUrl(null);
        return;
      }

      setStatus("validating");
      setServerUrl(auth.serverUrl);

      const isValid = await verifyToken(auth.serverUrl, auth.token);

      if (isValid) {
        setStatus("authenticated");
      } else {
        setStatus("invalid");
      }
    } catch (error) {
      console.error("[useAuth] Error checking auth:", error);
      setStatus("error");
    }
  }, []);

  // Listen for auth errors from API calls (e.g., 401 responses)
  useEffect(() => {
    const handleAuthError = () => {
      console.log("[useAuth] Received auth-error event, transitioning to invalid state");
      setStatus("invalid");
    };

    window.addEventListener("auth-error", handleAuthError);
    return () => {
      window.removeEventListener("auth-error", handleAuthError);
    };
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const retry = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  const clearAndRestart = useCallback(async () => {
    await clearAuth();
    setStatus("not_paired");
    setServerUrl(null);
  }, []);

  const setAuthenticated = useCallback((url: string) => {
    setStatus("authenticated");
    setServerUrl(url);
  }, []);

  return {
    status,
    serverUrl,
    retry,
    clearAndRestart,
    setAuthenticated,
  };
}
