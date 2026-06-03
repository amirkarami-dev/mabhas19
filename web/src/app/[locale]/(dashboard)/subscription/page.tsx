"use client"

import { useLocale, useTranslations } from "next-intl"
import { useSubscription } from "@/lib/queries"
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

  const { data: sub, isLoading } = useSubscription()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="me-2 text-brand-700" />
        {tc("loading")}
      </div>
    )
  }

  if (!sub) {
    return <Alert variant="error">{tc("error")}</Alert>
  }

  const maxProjects = Number(sub.maxProjects ?? 0)
  const usedProjects = Number(sub.usedProjects ?? 0)
  const pct =
    maxProjects > 0
      ? Math.min(100, Math.round((usedProjects / maxProjects) * 100))
      : 0

  const rows: Array<{ label: string; value: string }> = [
    { label: t("plan"), value: sub.plan ?? "-" },
    { label: t("maxProjects"), value: fmt(locale, maxProjects) },
    { label: t("usedProjects"), value: fmt(locale, usedProjects) },
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
                {fmt(locale, usedProjects)} / {fmt(locale, maxProjects)}
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
