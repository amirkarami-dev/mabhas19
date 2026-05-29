"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { authApi } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import {
  Alert,
  Button,
  CardBody,
  CardHeader,
  Field,
  Input,
  Spinner,
  cn,
} from "@/components/ui"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void
        }
      }
    }
  }
}

type Tab = "password" | "otp"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export default function LoginPage() {
  const t = useTranslations("auth")
  const router = useRouter()
  const { setTokens } = useAuth()

  const [tab, setTab] = useState<Tab>("password")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // password tab
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // otp tab
  const [phone, setPhone] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [code, setCode] = useState("")

  const finishLogin = useCallback(
    async (tokens: Awaited<ReturnType<typeof authApi.login>>) => {
      await setTokens(tokens)
      router.replace("/dashboard")
    },
    [setTokens, router]
  )

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const tokens = await authApi.login(email, password)
      await finishLogin(tokens)
    } catch (err) {
      if (err instanceof ApiError) setError(t("invalidCredentials"))
      else setError(t("invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      await authApi.requestOtp(phone)
      setOtpSent(true)
      setInfo(t("otpSent"))
    } catch {
      setError(t("invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const tokens = await authApi.verifyOtp(phone, code)
      await finishLogin(tokens)
    } catch {
      setError(t("invalidCredentials"))
    } finally {
      setLoading(false)
    }
  }

  // ---- Google Identity Services ----
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setError(null)
      setInfo(null)
      setLoading(true)
      try {
        const tokens = await authApi.google(idToken)
        await finishLogin(tokens)
      } catch {
        setError(t("invalidCredentials"))
      } finally {
        setLoading(false)
      }
    },
    [finishLogin, t]
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    const SCRIPT_SRC = "https://accounts.google.com/gsi/client"

    const setup = () => {
      const g = window.google
      if (!g || !googleBtnRef.current) return
      try {
        g.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void handleGoogleCredential(response.credential)
          },
        })
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
        })
      } catch {
        // defensive: ignore GIS init failures
      }
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    )
    if (existing) {
      if (window.google) setup()
      else existing.addEventListener("load", setup)
      return () => existing.removeEventListener("load", setup)
    }

    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener("load", setup)
    document.head.appendChild(script)
    return () => script.removeEventListener("load", setup)
  }, [handleGoogleCredential])

  return (
    <>
      <CardHeader>
        <h1 className="text-lg font-bold text-slate-900">{t("loginTitle")}</h1>
      </CardHeader>
      <CardBody>
        {/* Tabs */}
        <div className="mb-5 inline-flex w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
          <button
            type="button"
            onClick={() => {
              setTab("password")
              setError(null)
              setInfo(null)
            }}
            className={cn(
              "flex-1 px-4 py-2 transition-colors",
              tab === "password"
                ? "bg-brand-700 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {t("tabPassword")}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("otp")
              setError(null)
              setInfo(null)
            }}
            className={cn(
              "flex-1 px-4 py-2 transition-colors",
              tab === "otp"
                ? "bg-brand-700 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {t("tabOtp")}
          </button>
        </div>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}
        {info ? (
          <Alert variant="success" className="mb-4">
            {info}
          </Alert>
        ) : null}

        {tab === "password" ? (
          <form onSubmit={handlePasswordLogin} noValidate>
            <Field label={t("email")}>
              <Input
                type="email"
                autoComplete="email"
                dir="ltr"
                className="text-start"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label={t("password")}>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : null}
              {t("loginButton")}
            </Button>
          </form>
        ) : (
          <div>
            <form onSubmit={handleRequestOtp} noValidate>
              <Field label={t("phone")}>
                <Input
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  className="text-start"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                  required
                />
              </Field>
              {!otpSent ? (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner /> : null}
                  {t("requestOtp")}
                </Button>
              ) : null}
            </form>

            {otpSent ? (
              <form onSubmit={handleVerifyOtp} noValidate className="mt-4">
                <Field label={t("otpCode")}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    className="text-start"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner /> : null}
                  {t("verifyOtp")}
                </Button>
              </form>
            ) : null}
          </div>
        )}

        {/* Google sign-in */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className="flex justify-center" />
          ) : (
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled
              >
                {t("googleButton")}
              </Button>
              <p className="mt-2 text-start text-xs text-slate-400">
                Google sign-in needs configuration
                (NEXT_PUBLIC_GOOGLE_CLIENT_ID).
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-start text-sm text-slate-600">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-brand-700 hover:underline"
          >
            {t("goRegister")}
          </Link>
        </p>
      </CardBody>
    </>
  )
}
