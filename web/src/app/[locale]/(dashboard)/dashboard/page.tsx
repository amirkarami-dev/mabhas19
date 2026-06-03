"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useProjects, useSubscription } from "@/lib/queries"
import type { ProjectDto } from "@/components/projects/project-types"
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
} from "@/components/ui"

function fmt(locale: string, n: number | undefined | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(n)
}

export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const tp = useTranslations("projects")
  const tc = useTranslations("common")
  const locale = useLocale()

  const projectsQuery = useProjects()
  const subscriptionQuery = useSubscription()

  // Subscription is non-fatal here — the dashboard still renders if it fails.
  const projects = (projectsQuery.data ?? []) as ProjectDto[]
  const sub = subscriptionQuery.data ?? null

  const recent = [...projects]
    .sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""))
    .slice(0, 5)

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="me-2 text-brand-700" />
        {tc("loading")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {projectsQuery.isError ? <Alert variant="error">{tc("error")}</Alert> : null}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("totalProjects")}
          value={fmt(locale, projects.length)}
          tone="brand"
        />
        <StatCard
          label={t("subscriptionUsage")}
          value={
            sub
              ? t("usedOf", {
                  used: fmt(locale, sub.usedProjects == null ? sub.usedProjects : Number(sub.usedProjects)),
                  max: fmt(locale, sub.maxProjects == null ? sub.maxProjects : Number(sub.maxProjects)),
                })
              : "-"
          }
          tone="green"
        />
        <StatCard label={t("plan")} value={sub?.plan ?? "-"} tone="slate" />
      </div>

      {/* Recent projects */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{t("recentProjects")}</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              {tp("title")}
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {t("noProjects")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-start text-xs text-slate-500">
                    <th className="px-5 py-3 text-start font-medium">{tp("name")}</th>
                    <th className="px-5 py-3 text-start font-medium">{tp("city")}</th>
                    <th className="px-5 py-3 text-start font-medium">{tp("buildingGroup")}</th>
                    <th className="px-5 py-3 text-end font-medium">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{p.title}</td>
                      <td className="px-5 py-3 text-slate-600">{p.city || "-"}</td>
                      <td className="px-5 py-3">
                        {p.buildingGroupLabel ? (
                          <Badge tone="brand">{p.buildingGroupLabel}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-3 text-end">
                        <Link href={`/projects/${p.id}`}>
                          <Button variant="outline" size="sm">
                            {tp("openProject")}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "brand" | "green" | "slate"
}) {
  const accent =
    tone === "brand"
      ? "text-brand-700"
      : tone === "green"
        ? "text-emerald-600"
        : "text-slate-700"
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      </CardBody>
    </Card>
  )
}
