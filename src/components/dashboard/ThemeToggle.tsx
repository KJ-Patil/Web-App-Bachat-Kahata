"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/themeProvider";
import { useTranslation } from "@/i18n/i18nContext";

/**
 * Light/dark switch styled to match the notification bell beside it.
 *
 * Both icons are always rendered and stacked on top of each other; only their
 * rotation/scale changes, which gives the sun↔moon swap a smooth crossfade
 * instead of a pop. The icon shown reflects the theme currently in effect.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const label = theme === "dark" ? t("common.switchToLight") : t("common.switchToDark");

  return (
    <button
      onClick={toggleTheme}
      className="relative p-3 rounded-xl border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all cursor-pointer"
      aria-label={label}
      title={label}
    >
      {/* Sized box so the two absolutely-positioned icons keep the button square. */}
      <span className="relative block w-5 h-5">
        <Sun
          className="absolute inset-0 w-5 h-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
          aria-hidden="true"
        />
        <Moon
          className="absolute inset-0 w-5 h-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

export default ThemeToggle;
