import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { authApi, saveTokens } from "./endpoints"
import { tokenStore } from "./tokens"
import type { CurrentUser } from "./types"

interface AuthContextValue {
  user: CurrentUser | null
  isAdmin: boolean
  loading: boolean
  loginWithPassword: (email: string, password: string) => Promise<void>
  loginWithOtp: (phoneNumber: string, code: string) => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await tokenStore.load()
      if (tokenStore.getAccess()) {
        await refreshUser()
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const tokens = await authApi.login(email, password)
      await saveTokens(tokens)
      await refreshUser()
    },
    [refreshUser],
  )

  const loginWithOtp = useCallback(
    async (phoneNumber: string, code: string) => {
      const tokens = await authApi.verifyOtp(phoneNumber, code)
      await saveTokens(tokens)
      await refreshUser()
    },
    [refreshUser],
  )

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const tokens = await authApi.google(idToken)
      await saveTokens(tokens)
      await refreshUser()
    },
    [refreshUser],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    }
    await tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.isAdmin ?? false,
      loading,
      loginWithPassword,
      loginWithOtp,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, loading, loginWithPassword, loginWithOtp, loginWithGoogle, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
