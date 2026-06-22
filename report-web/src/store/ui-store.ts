import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeMode } from "../theme/theme";
import type { AppLocale } from "../i18n";

interface UiState {
  mode: ThemeMode;
  locale: AppLocale;
  dir: "rtl" | "ltr";
  sidebarCollapsed: boolean;
  setMode: (m: ThemeMode) => void;
  setLocale: (l: AppLocale) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mode: "light",
      locale: "fa",
      dir: "rtl",
      sidebarCollapsed: false,
      setMode: (mode) => set({ mode }),
      setLocale: (locale) => set({ locale, dir: locale === "fa" ? "rtl" : "ltr" }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "report.ui" },
  ),
);
