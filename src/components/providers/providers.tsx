"use client";

import React from "react";
import { I18nProvider } from "@/i18n/i18nContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
export default Providers;
