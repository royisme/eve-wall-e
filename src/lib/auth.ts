// Token management and authentication utilities
import { getBaseUrl } from "./api";

const AUTH_HEADER = "x-eve-token";

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  serverHost: string;
  serverPort: string;
  serverUrl: string;
  pairedAt: number | null;
  eveVersion?: string;
}

export interface AuthStorage {
  authToken?: string;
  serverHost?: string;
  serverPort?: string;
  pairedAt?: number;
  eveVersion?: string;
}

const DEFAULT_HOST = "localhost";
const DEFAULT_PORT = "3033";

// Get stored auth information
export async function getStoredAuth(): Promise<AuthState | null> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["authToken", "serverHost", "serverPort", "pairedAt", "eveVersion"],
        (result: AuthStorage) => {
          if (!result.authToken) {
            resolve(null);
            return;
          }

          const host = result.serverHost || DEFAULT_HOST;
          const port = result.serverPort || DEFAULT_PORT;

          resolve({
            isAuthenticated: true,
            token: result.authToken,
            serverHost: host,
            serverPort: port,
            serverUrl: `http://${host}:${port}`,
            pairedAt: result.pairedAt || null,
            eveVersion: result.eveVersion,
          });
        }
      );
    });
  }
  return null;
}

// Save auth information to storage
export async function saveAuth(data: {
  token: string;
  serverHost: string;
  serverPort: string;
  eveVersion?: string;
}): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          authToken: data.token,
          serverHost: data.serverHost,
          serverPort: data.serverPort,
          pairedAt: Date.now(),
          eveVersion: data.eveVersion,
        },
        () => resolve()
      );
    });
  }
}

// Clear auth information
export async function clearAuth(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(["authToken", "serverHost", "serverPort", "pairedAt", "eveVersion"], () => resolve());
    });
  }
}

// Verify token validity by calling Eve API
export async function verifyToken(serverUrl: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/auth/verify`, {
      method: "GET",
      headers: {
        [AUTH_HEADER]: token,
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}

// Request pairing from Eve API
export interface PairingResponse {
  success: boolean;
  token?: string;
  error?: string;
  conflict?: boolean;
}

export async function requestPairing(serverUrl: string, oldToken?: string): Promise<PairingResponse> {
  try {
    const body: Record<string, string> = {};
    if (oldToken) {
      body.oldToken = oldToken;
    }

    const response = await fetch(`${serverUrl}/auth/pair`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      return {
        success: true,
        token: data.token,
      };
    }

    return {
      success: false,
      error: data.message || "Pairing failed",
      conflict: response.status === 409,
    };
  } catch (error) {
    console.error("Pairing request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

// Get auth token for API calls
export async function getAuthToken(): Promise<string | null> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["authToken"], (result: { authToken?: string }) => {
        resolve(result.authToken || null);
      });
    });
  }
  return null;
}

// Get server URL from stored settings
export async function getServerUrl(): Promise<string> {
  const auth = await getStoredAuth();
  if (auth && auth.serverUrl) {
    return auth.serverUrl;
  }

  // Fallback to old settings format
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["serverPort"], (result: { serverPort?: string }) => {
        const port = result.serverPort || DEFAULT_PORT;
        resolve(`http://${DEFAULT_HOST}:${port}`);
      });
    });
  }

  return `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
}
