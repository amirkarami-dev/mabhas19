"use client"

import { Suspense, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth-context"
import { Spinner } from "@/components/ui"

function CallbackScreen() {
  const t = useTranslations("auth")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-white">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{t("callbackProcessing")}</p>
    </div>
  )
}

function AuthCallbackInner() {
  const router = useRouter()
  const { setTokens } = useAuth()
  const searchParams = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const accessToken = searchParams.get("accessToken")
    const refreshToken = searchParams.get("refreshToken")

    if (accessToken && refreshToken) {
      void (async () => {
        await setTokens({
          accessToken,
          refreshToken,
          expiresIn: 3600,
          tokenType: "Bearer",
        })
        router.replace("/dashboard")
      })()
    } else {
      router.replace("/login")
    }
  }, [searchParams, setTokens, router])

  return <CallbackScreen />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackScreen />}>
      <AuthCallbackInner />
    </Suspense>
  )
}
