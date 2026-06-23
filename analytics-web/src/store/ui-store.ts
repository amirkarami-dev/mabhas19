import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ThemeMode } from "../theme/theme";
import type { AppLocale } from "../i18n";

interface UiState {
  mode: ThemeMode;
  locale: AppLocale;
  dir: "rtl" | "ltr";
  sidebarCollapsed: boolean;
  previewPrimaryColor: string | null;
  /** Dark-mode toggle — persisted to localStorage key `analytics-theme`. */
  themeMode: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  setLocale: (l: AppLocale) => void;
  toggleSidebar: () => void;
  setPreviewPrimaryColor: (color: string | null) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      mode: "light",
      locale: "fa",
      dir: "rtl",
      sidebarCollapsed: false,
      previewPrimaryColor: null,
      themeMode: ((): "light" | "dark" => {
        try {
          const stored = localStorage.getItem("analytics-theme");
          return stored === "dark" ? "dark" : "light";
        } catch {
          return "light";
        }
      })(),
      setMode: (mode) => set({ mode }),
      setLocale: (locale) => set({ locale, dir: locale === "fa" ? "rtl" : "ltr" }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPreviewPrimaryColor: (previewPrimaryColor) => set({ previewPrimaryColor }),
      toggleTheme: () =>
        set((s) => {
          const next = s.themeMode === "light" ? "dark" : "light";
          try {
            localStorage.setItem("analytics-theme", next);
          } catch {
            /* SSR / private browsing — ignore */
          }
          return { themeMode: next };
        }),
    }),
    {
      name: "report.ui",
      storage: createJSONStorage(() => localStorage),
      // Only persist the fields that belong to the report.ui key; themeMode
      // has its own key ("analytics-theme") managed manually in toggleTheme.
      partialize: (s) => ({
        mode: s.mode,
        locale: s.locale,
        dir: s.dir,
        sidebarCollapsed: s.sidebarCollapsed,
        previewPrimaryColor: s.previewPrimaryColor,
      }),
    },
  ),
);
