import { put, get } from "@/lib/db";

// Settings interface
export interface Settings {
  serverPort: string;
  language: string;
  theme?: "light" | "dark" | "system";
  lastSyncTime?: number;
}

// Default settings
const DEFAULT_SETTINGS: Settings = {
  serverPort: "3033",
  language: "en",
  theme: "system",
};

// Storage key
const SETTINGS_STORE = "settings";
const SETTINGS_KEY = "app-settings";

// Get settings from chrome.storage (primary) with IndexedDB backup
export async function getSettings(): Promise<Settings> {
  // Try chrome.storage first
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["serverPort", "language", "theme", "lastSyncTime"],
        (result: Partial<Settings>) => {
          resolve({
            serverPort: result.serverPort || DEFAULT_SETTINGS.serverPort,
            language: result.language || DEFAULT_SETTINGS.language,
            theme: result.theme || DEFAULT_SETTINGS.theme,
            lastSyncTime: result.lastSyncTime,
          });
        },
      );
    });
  }

  // Fallback to IndexedDB for offline/dev mode
  try {
    const stored = await get<Settings>(SETTINGS_STORE, SETTINGS_KEY);
    return stored || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Save settings to both chrome.storage and IndexedDB
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };

  // Save to chrome.storage (primary)
  if (typeof chrome !== "undefined" && chrome.storage) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(updated, () => resolve());
    });
  }

  // Backup to IndexedDB for offline access
  try {
    await put(SETTINGS_STORE, { id: SETTINGS_KEY, ...updated });
  } catch (error) {
    console.warn("Failed to backup settings to IndexedDB:", error);
  }
}

// Update a single setting
export async function updateSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await saveSettings({ [key]: value });
}

// Get a single setting
export async function getSetting<K extends keyof Settings>(
  key: K,
): Promise<Settings[K]> {
  const settings = await getSettings();
  return settings[key];
}

// Update last sync time
export async function updateLastSyncTime(): Promise<void> {
  await updateSetting("lastSyncTime", Date.now());
}

// Migrate old settings format if needed
export async function migrateSettings(): Promise<void> {
  // Check for old format in chrome.storage
  if (typeof chrome !== "undefined" && chrome.storage) {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, async (result) => {
        // If we have old format keys that need migration
        if (
          result.port &&
          !result.serverPort &&
          typeof result.port === "string"
        ) {
          await saveSettings({ serverPort: result.port });
          chrome.storage.local.remove(["port"]);
        }
        resolve();
      });
    });
  }
}
