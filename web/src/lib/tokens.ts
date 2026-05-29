import type { TokenResponse } from "./types"

const ACCESS_KEY = "m19_accessToken"
const REFRESH_KEY = "m19_refreshToken"

const isBrowser = () => typeof window !== "undefined"

export const tokenStore = {
  getAccess(): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh(): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(REFRESH_KEY)
  },
  set(tokens: Pick<TokenResponse, "accessToken" | "refreshToken">) {
    if (!isBrowser()) return
    localStorage.setItem(ACCESS_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  },
  clear() {
    if (!isBrowser()) return
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
  hasToken(): boolean {
    return Boolean(this.getAccess())
  },
}
