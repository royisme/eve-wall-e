import { useState, useEffect, useCallback } from "react";
import {
  getSettings,
  saveSettings,
  updateSetting,
  type Settings,
} from "@/lib/settings";

interface UseSettingsReturn {
  settings: Settings | null;
  isLoading: boolean;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  save: (updates: Partial<Settings>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    try {
      const loaded = await getSettings();
      setSettings(loaded);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update a single setting
  const update = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      await updateSetting(key, value);
      setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    },
    []
  );

  // Save multiple settings at once
  const save = useCallback(async (updates: Partial<Settings>) => {
    await saveSettings(updates);
    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // Refresh settings from storage
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    update,
    save,
    refresh,
  };
}
