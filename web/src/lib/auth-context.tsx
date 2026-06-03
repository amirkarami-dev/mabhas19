"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { signOut, useSession } from "next-auth/react"
import { authApi } from "./endpoints"
import type { CurrentUser } from "./types"

interface AuthState {
  user: CurrentUser | null
  roles: string[]
  isAdmin: boolean
  ready: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [userFetched, setUserFetched] = useState(false)

  const ready = status !== "loading"
  const isAuthenticated = status === "authenticated"

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null)
      return
    }
    try {
      const info = await authApi.me()
      setUser(info)
    } catch {
      setUser(null)
    }
  }, [isAuthenticated])

  // Fetch user profile once when the session becomes authenticated.
  useEffect(() => {
    void (async () => {
      if (!isAuthenticated) {
        setUser(null)
        setUserFetched(false)
        return
      }
      if (userFetched) return
      setUserFetched(true)
      await refreshUser()
    })()
  }, [isAuthenticated, userFetched, refreshUser])

  const logout = useCallback(async () => {
    await signOut({ redirect: false })
    setUser(null)
    setUserFetched(false)
    const issuer = process.env.NEXT_PUBLIC_AUTH_ISSUER
    if (issuer) {
      window.location.href = `${issuer}/connect/logout`
    } else {
      window.location.href = "/login"
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        roles: user?.roles ?? [],
        isAdmin: user?.isAdmin ?? false,
        ready,
        isAuthenticated,
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
