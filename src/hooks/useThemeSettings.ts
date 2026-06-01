import { useTheme } from "@/components/providers/ThemeProvider";
import { useCallback } from "react";

export interface ThemeSettings {
  theme: "light" | "dark" | "system" | "blue-marrengula" | "green";
  lastChanged: number;
  systemPreference?: "light" | "dark";
}

const THEME_STORAGE_KEY = "theme-settings";

export function useThemeSettings() {
  const { theme, setTheme, resolvedTheme, themeVariant, availableThemes } = useTheme();

  const getThemeSettings = useCallback((): ThemeSettings => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.warn("Failed to parse theme settings", e);
      }
    }

    return {
      theme,
      lastChanged: Date.now(),
      systemPreference: resolvedTheme,
    };
  }, [theme, resolvedTheme]);

  const updateThemeSettings = useCallback((newTheme: typeof theme) => {
    setTheme(newTheme);

    const settings: ThemeSettings = {
      theme: newTheme,
      lastChanged: Date.now(),
      systemPreference: resolvedTheme,
    };

    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  }, [setTheme, resolvedTheme]);

  const resetToSystemPreference = useCallback(() => {
    updateThemeSettings("system");
  }, [updateThemeSettings]);

  const getCurrentThemeLabel = useCallback((): string => {
    const labels: Record<string, string> = {
      light: "Claro",
      dark: "Escuro",
      "blue-marrengula": "Azul Marrengula",
      green: "Verde Natureza",
      system: "Sistema",
    };
    return labels[theme] || "Desconhecido";
  }, [theme]);

  return {
    theme,
    setTheme: updateThemeSettings,
    resolvedTheme,
    themeVariant,
    availableThemes,
    getSettings: getThemeSettings,
    updateSettings: updateThemeSettings,
    resetToSystemPreference,
    getCurrentThemeLabel,
  };
}
