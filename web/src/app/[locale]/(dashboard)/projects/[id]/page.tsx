"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import {
  useDeleteProject,
  useGenerateReport,
  useProject,
  useUpdateProject,
} from "@/lib/queries"
import type { CreateProjectInput } from "@/lib/types"
import { M19_CLIMATE_DEFINITIONS } from "@/features/assessment/data/climate"
import type { ProjectDto } from "@/components/projects/project-types"
import { ProjectForm } from "@/components/projects/project-form"
import { Modal } from "@/components/projects/modal"
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

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const t = useTranslations("projects")
  const tc = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const projectQuery = useProject(id)
  const updateProject = useUpdateProject(id)
  const generateReport = useGenerateReport(id)
  const deleteProject = useDeleteProject()

  const [editOpen, setEditOpen] = useState(false)

  const project = (projectQuery.data ?? null) as ProjectDto | null

  const handleSave = (input: CreateProjectInput) => {
    updateProject.mutate(input, { onSuccess: () => setEditOpen(false) })
  }

  const handleReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: (res) => {
        if (res?.downloadUrl) window.open(res.downloadUrl, "_blank")
      },
    })
  }

  const handleDelete = () => {
    if (!window.confirm(t("deleteConfirm"))) return
    deleteProject.mutate(id, { onSuccess: () => router.push("/projects") })
  }

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="me-2 text-brand-700" />
        {tc("loading")}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{tc("error")}</Alert>
        <Link href="/projects">
          <Button variant="outline">{tc("back")}</Button>
        </Link>
      </div>
    )
  }

  const climateLabel = project.climateCode
    ? M19_CLIMATE_DEFINITIONS[project.climateCode] ?? project.climateCode
    : t("noClimate")

  const rows: Array<{ label: string; value: string }> = [
    { label: t("client"), value: project.client || "-" },
    { label: t("address"), value: project.address || "-" },
    { label: t("city"), value: project.city || "-" },
    { label: t("climateCode"), value: climateLabel },
    { label: t("totalArea"), value: fmt(locale, project.totalArea == null ? project.totalArea : Number(project.totalArea)) },
    { label: t("floorCount"), value: fmt(locale, project.floorCount == null ? project.floorCount : Number(project.floorCount)) },
    { label: t("unitCount"), value: fmt(locale, project.unitCount == null ? project.unitCount : Number(project.unitCount)) },
    { label: t("usage"), value: project.usage || "-" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
              {tc("back")}
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">{project.title}</h1>
          {project.buildingGroupLabel ? (
            <Badge tone="brand">{project.buildingGroupLabel}</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/projects/${id}/assessment`}>
            <Button variant="outline">{t("assessment")}</Button>
          </Link>
          <Button onClick={handleReport} disabled={generateReport.isPending}>
            {generateReport.isPending ? <Spinner /> : null}
            {generateReport.isPending ? t("generatingReport") : t("report")}
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            {tc("edit")}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? <Spinner /> : null}
            {tc("delete")}
          </Button>
        </div>
      </div>

      {updateProject.isError || deleteProject.isError ? (
        <Alert variant="error">{tc("error")}</Alert>
      ) : null}
      {generateReport.isError ? (
        <Alert variant="error">{tc("error")}</Alert>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">{t("detail")}</h2>
        </CardHeader>
        <CardBody className="p-0">
          <dl className="divide-y divide-slate-50">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between px-5 py-3 text-sm">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="font-medium text-slate-900">{r.value}</dd>
              </div>
            ))}
            {project.hasAssessment ? (
              <div className="flex items-center justify-between px-5 py-3 text-sm">
                <dt className="text-slate-500">{t("assessment")}</dt>
                <dd>
                  <Badge tone="green">
                    {fmt(locale, project.totalScore == null ? project.totalScore : Number(project.totalScore))} / {fmt(locale, project.maxScore == null ? project.maxScore : Number(project.maxScore))}
                  </Badge>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      <Modal
        title={tc("edit")}
        open={editOpen}
        onClose={() => (updateProject.isPending ? undefined : setEditOpen(false))}
      >
        <ProjectForm
          initial={{
            title: project.title,
            client: project.client ?? undefined,
            address: project.address ?? undefined,
            city: project.city,
            climateCode: project.climateCode,
            totalArea: project.totalArea,
            floorCount: project.floorCount,
            unitCount: project.unitCount,
            usage: project.usage ?? undefined,
          }}
          submitting={updateProject.isPending}
          onSubmit={handleSave}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  )
}
