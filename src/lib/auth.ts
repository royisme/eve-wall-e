import { endpoints, buildUrl } from "./endpoints";

const AUTH_HEADER = "x-eve-token";
const DEFAULT_SERVER_URL = "http://localhost:3033";
const STORAGE_KEY_SERVER_URL = "serverUrl";

export function getExtensionId(): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    return chrome.runtime.id;
  }
  return "dev-extension-id";
}

export async function getAuthToken(): Promise<string> {
  return getExtensionId();
}

export async function getServerUrl(): Promise<string> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_SERVER_URL], (result: { [key: string]: string | undefined }) => {
        resolve(result[STORAGE_KEY_SERVER_URL] || DEFAULT_SERVER_URL);
      });
    });
  }
  return DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY_SERVER_URL]: url }, () => resolve());
    });
  }
}

export async function verifyConnection(serverUrl: string): Promise<{ ok: boolean; version?: string }> {
  try {
    const response = await fetch(buildUrl(serverUrl, endpoints.health), {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { ok: false };
    }

    const data = await response.json();
    return { ok: true, version: data.version };
  } catch {
    return { ok: false };
  }
}

export async function isConfigured(): Promise<boolean> {
  const serverUrl = await getServerUrl();
  if (!serverUrl || serverUrl === DEFAULT_SERVER_URL) {
    return false;
  }
  const result = await verifyConnection(serverUrl);
  return result.ok;
}

export async function clearConfig(): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEY_SERVER_URL], () => resolve());
    });
  }
}
