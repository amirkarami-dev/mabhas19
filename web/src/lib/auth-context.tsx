"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { authApi, saveTokens } from "./endpoints"
import { tokenStore } from "./tokens"
import type { TokenResponse, UserInfo } from "./types"

interface AuthState {
  user: UserInfo | null
  ready: boolean
  isAuthenticated: boolean
  setTokens: (tokens: TokenResponse) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [ready, setReady] = useState(false)

  const refreshUser = useCallback(async () => {
    if (!tokenStore.hasToken()) {
      setUser(null)
      return
    }
    try {
      const info = await authApi.me()
      setUser(info)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      await refreshUser()
      if (active) setReady(true)
    })()
    return () => {
      active = false
    }
  }, [refreshUser])

  const setTokens = useCallback(
    async (tokens: TokenResponse) => {
      saveTokens(tokens)
      await refreshUser()
    },
    [refreshUser]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    }
    tokenStore.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isAuthenticated: Boolean(user) || tokenStore.hasToken(),
        setTokens,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
