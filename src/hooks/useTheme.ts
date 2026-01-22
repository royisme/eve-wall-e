import { useEffect } from "react";
import { useSettings } from "./useSettings";

export function useTheme() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings?.theme) return;

    const root = document.documentElement;
    const theme = settings.theme;

    // Remove both classes first
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Use system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "dark" : "light");

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      // Use explicit theme setting
      root.classList.add(theme);
    }
  }, [settings?.theme]);
}
