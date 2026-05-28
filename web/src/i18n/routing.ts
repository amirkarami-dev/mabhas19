import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["fa", "en"],
  defaultLocale: "fa",
  // fa is the default and served at "/" (no prefix); en is served at "/en/...".
  localePrefix: "as-needed",
})

export type Locale = (typeof routing.locales)[number]
