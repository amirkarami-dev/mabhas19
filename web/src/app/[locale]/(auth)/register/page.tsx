"use client"

import { useState, type FormEvent } from "react"
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
} from "@/components/ui"

export default function RegisterPage() {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const router = useRouter()
  const { setTokens } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError(t("passwordMismatch"))
      return
    }

    setLoading(true)
    try {
      await authApi.register(email, password)
      const tokens = await authApi.login(email, password)
      await setTokens(tokens)
      router.replace("/dashboard")
    } catch (err) {
      if (err instanceof ApiError) {
        const message =
          typeof err.body === "string" && err.body
            ? err.body
            : tc("error")
        setError(message)
      } else {
        setError(tc("error"))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <CardHeader>
        <h1 className="text-lg font-bold text-slate-900">
          {t("registerTitle")}
        </h1>
      </CardHeader>
      <CardBody>
        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field label={t("confirmPassword")}>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : null}
            {t("registerButton")}
          </Button>
        </form>

        <p className="mt-6 text-start text-sm text-slate-600">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-brand-700 hover:underline"
          >
            {t("goLogin")}
          </Link>
        </p>
      </CardBody>
    </>
  )
}
