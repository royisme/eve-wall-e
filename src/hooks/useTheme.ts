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

    // Determine if dark mode is active
    let isDark = false;

    if (theme === "system") {
      // Use system preference
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(isDark ? "dark" : "light");

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        const newIsDark = e.matches;
        root.classList.add(newIsDark ? "dark" : "light");
        loadHighlightTheme(newIsDark);
      };

      mediaQuery.addEventListener("change", handler);
      loadHighlightTheme(isDark);

      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      // Use explicit theme setting
      isDark = theme === "dark";
      root.classList.add(theme);
      loadHighlightTheme(isDark);
    }
  }, [settings?.theme]);
}

// Dynamically load highlight.js theme based on dark mode
function loadHighlightTheme(isDark: boolean) {
  const existingLink = document.getElementById("highlight-theme");
  if (existingLink) {
    existingLink.remove();
  }

  const link = document.createElement("link");
  link.id = "highlight-theme";
  link.rel = "stylesheet";
  link.href = isDark
    ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
    : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";

  document.head.appendChild(link);
}
