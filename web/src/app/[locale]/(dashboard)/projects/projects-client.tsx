"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useCreateProject, useDeleteProject, useProjects } from "@/lib/queries"
import { ApiError } from "@/lib/api"
import type { CreateProjectInput } from "@/lib/types"
import type { ProjectDto } from "@/components/projects/project-types"
import { ProjectForm } from "@/components/projects/project-form"
import { Modal } from "@/components/projects/modal"
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Spinner,
} from "@/components/ui"

function fmt(locale: string, n: number | undefined | null): string {
  if (n == null) return "-"
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(n)
}

// Pull a Subscription-limit message out of an ApiError body (400 with errors.Subscription)
function extractSubscriptionError(err: unknown): string | null {
  if (err instanceof ApiError && err.status === 400) {
    const body = err.body as { errors?: { Subscription?: string[] } } | null
    const msgs = body?.errors?.Subscription
    if (Array.isArray(msgs) && msgs.length) return msgs.join(" ")
  }
  return null
}

export default function ProjectsClient() {
  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const locale = useLocale()

  const projectsQuery = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()

  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const projects = (projectsQuery.data ?? []) as ProjectDto[]
  // Single delete is in flight at a time; derive the busy row from the mutation.
  const deletingId = deleteProject.isPending
    ? String(deleteProject.variables)
    : null

  const handleCreate = (input: CreateProjectInput) => {
    setCreateError(null)
    createProject.mutate(input, {
      onSuccess: () => setCreateOpen(false),
      onError: (err) => {
        const subMsg = extractSubscriptionError(err)
        setCreateError(subMsg ?? tc("error"))
      },
    })
  }

  const handleDelete = (id: string | number) => {
    if (!window.confirm(t("deleteConfirm"))) return
    deleteProject.mutate(String(id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t("title")}</h1>
        <Button
          onClick={() => {
            setCreateError(null)
            setCreateOpen(true)
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t("newProject")}
        </Button>
      </div>

      {projectsQuery.isError || deleteProject.isError ? (
        <Alert variant="error">{tc("error")}</Alert>
      ) : null}

      <Card>
        <CardBody className="p-0">
          {projectsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Spinner className="me-2 text-brand-700" />
              {tc("loading")}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="px-5 py-3 text-start font-medium">{t("name")}</th>
                    <th className="px-5 py-3 text-start font-medium">{t("city")}</th>
                    <th className="px-5 py-3 text-start font-medium">{t("buildingGroup")}</th>
                    <th className="px-5 py-3 text-start font-medium">{t("totalArea")}</th>
                    <th className="px-5 py-3 text-start font-medium">{t("floorCount")}</th>
                    <th className="px-5 py-3 text-start font-medium">{t("assessment")}</th>
                    <th className="px-5 py-3 text-end font-medium">{tc("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{p.title}</td>
                      <td className="px-5 py-3 text-slate-600">{p.city || "-"}</td>
                      <td className="px-5 py-3">
                        {p.buildingGroupLabel ? <Badge tone="brand">{p.buildingGroupLabel}</Badge> : "-"}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{fmt(locale, p.totalArea == null ? p.totalArea : Number(p.totalArea))}</td>
                      <td className="px-5 py-3 text-slate-600">{fmt(locale, p.floorCount == null ? p.floorCount : Number(p.floorCount))}</td>
                      <td className="px-5 py-3">
                        {p.hasAssessment ? (
                          <Badge tone="green">
                            {fmt(locale, p.totalScore == null ? p.totalScore : Number(p.totalScore))} / {fmt(locale, p.maxScore == null ? p.maxScore : Number(p.maxScore))}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">{tc("none")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/projects/${p.id}`}>
                            <Button variant="outline" size="sm">
                              {t("openProject")}
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            disabled={deletingId === String(p.id)}
                            onClick={() => handleDelete(p.id!)}
                          >
                            {deletingId === String(p.id) ? <Spinner /> : tc("delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        title={t("createTitle")}
        open={createOpen}
        onClose={() => (createProject.isPending ? undefined : setCreateOpen(false))}
      >
        {createError ? (
          <Alert variant="error" className="mb-4">
            {createError}
          </Alert>
        ) : null}
        <ProjectForm
          submitting={createProject.isPending}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  )
}
