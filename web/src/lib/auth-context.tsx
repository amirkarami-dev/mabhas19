"use client"

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react"
import { signOut } from "next-auth/react"
import { useQueryClient } from "@tanstack/react-query"
import type { CurrentUser } from "./types"

interface AuthState {
  user: CurrentUser | null
  roles: string[]
  isAdmin: boolean
  ready: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Identity is resolved on the server (from the session JWT) and passed in as initialUser,
// so there's no client fetch and no auth flicker. Route protection lives in middleware.
export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser
  children: ReactNode
}) {
  const qc = useQueryClient()

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
        user: initialUser,
        roles: initialUser.roles ?? [],
        isAdmin: initialUser.isAdmin ?? false,
        ready: true,
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
