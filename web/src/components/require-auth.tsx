"use client"

import { useEffect, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui"

/**
 * Client-side guard for protected areas. While auth state is resolving it shows a
 * spinner; if unauthenticated it redirects to /login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated } = useAuth()
  const router = useRouter()
  const t = useTranslations("common")

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login")
    }
  }, [ready, isAuthenticated, router])

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        <Spinner className="me-2 text-brand-700" />
        {t("loading")}
      </div>
    )
  }

  return <>{children}</>
}
