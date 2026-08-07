"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Theme = "light" | "dark";

/** localStorage key — must stay in sync with the inline script in app/layout.tsx. */
export const THEME_STORAGE_KEY = "theme";

interface ThemeContextValue {
  /** The currently applied theme. */
  theme: Theme;
  /** Flip between light and dark (persists to localStorage). */
  toggleTheme: () => void;
  /** Apply a specific theme (persists to localStorage). */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Reads the theme that is *already on the DOM*.
 *
 * The inline script in the root layout runs while the HTML is still being
 * parsed, so by the time React hydrates, <html> already carries the correct
 * `.dark` class. Initialising from the DOM instead of re-reading localStorage
 * guarantees React's first render agrees with what the user is looking at,
 * so there is no flash and no hydration mismatch.
 */
function readAppliedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Keeps native UI (scrollbars, form controls, caret) in step with the theme.
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readAppliedTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private-mode / storage-disabled browsers: theme still applies for this session.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readAppliedTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  // Follow the OS setting for as long as the user has not made an explicit choice.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        // Ignore — treated as "no explicit preference".
      }
      if (stored === "light" || stored === "dark") return;
      const next: Theme = e.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook consumed by any component that needs the active theme.
 *
 *   const { theme, toggleTheme } = useTheme();
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
