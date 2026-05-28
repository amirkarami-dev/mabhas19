"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { subscriptionApi } from "@/lib/endpoints"
import type { Subscription } from "@/lib/types"
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Spinner,
} from "@/components/ui"

function fmt(locale: string, n: number | undefined | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(n)
}

function fmtDate(locale: string, iso?: string | null): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

export default function SubscriptionPage() {
  const t = useTranslations("subscription")
  const tc = useTranslations("common")
  const locale = useLocale()

  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const s = await subscriptionApi.me()
        if (active) setSub(s)
      } catch {
        if (active) setError(tc("error"))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [tc])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="me-2 text-brand-700" />
        {tc("loading")}
      </div>
    )
  }

  if (!sub) {
    return <Alert variant="error">{error ?? tc("error")}</Alert>
  }

  const pct =
    sub.maxProjects > 0
      ? Math.min(100, Math.round((sub.usedProjects / sub.maxProjects) * 100))
      : 0

  const rows: Array<{ label: string; value: string }> = [
    { label: t("plan"), value: sub.plan },
    { label: t("maxProjects"), value: fmt(locale, sub.maxProjects) },
    { label: t("usedProjects"), value: fmt(locale, sub.usedProjects) },
    { label: t("validTo"), value: fmtDate(locale, sub.validTo) },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-lg font-bold text-slate-900">{t("title")}</h1>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{t("plan")}</h2>
          <Badge tone="brand">{sub.plan}</Badge>
        </CardHeader>
        <CardBody className="space-y-5">
          {/* Usage progress */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-slate-600">{t("usedProjects")}</span>
              <span className="font-medium text-slate-900">
                {fmt(locale, sub.usedProjects)} / {fmt(locale, sub.maxProjects)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <dl className="divide-y divide-slate-50 border-t border-slate-50">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-3 text-sm">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="font-medium text-slate-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}
