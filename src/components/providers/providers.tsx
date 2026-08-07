"use client";

import React from "react";
import { I18nProvider } from "@/i18n/i18nContext";
import { ThemeProvider } from "@/components/providers/themeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
export default Providers;
