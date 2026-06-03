"use client"

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react"
import { signOut, useSession } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import { useCurrentUser } from "./queries"
import { queryKeys } from "./query-keys"
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
  const qc = useQueryClient()

  const ready = status !== "loading"
  const isAuthenticated = status === "authenticated"

  // The user profile is fetched (and cached) only once the session is authenticated;
  // disabling the query when signed out yields `undefined` -> null.
  const { data: user = null } = useCurrentUser(isAuthenticated)

  const refreshUser = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.currentUser })
  }, [qc])

  const logout = useCallback(async () => {
    await signOut({ redirect: false })
    qc.clear() // drop all cached private data so nothing leaks to the next user
    const issuer = process.env.NEXT_PUBLIC_AUTH_ISSUER
    if (issuer) {
      window.location.href = `${issuer}/connect/logout`
    } else {
      window.location.href = "/login"
    }
  }, [qc])

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
