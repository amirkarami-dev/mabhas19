"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Alert, Badge, Button, Card, CardBody, CardHeader, Spinner } from "@/components/ui"
import { projectsApi } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import {
  ASSESSMENT_SECTIONS,
  TOTAL_MAX_SCORE,
  type ToolKey,
  type ToolResult,
} from "./data/sections"
import type { BuildingMeta } from "./checklists/shared"
import EnvOpaqueChecklist from "./checklists/EnvOpaqueChecklist"
import EnvTransChecklist from "./checklists/EnvTransChecklist"
import MechChecklist from "./checklists/MechChecklist"
import ElecChecklist from "./checklists/ElecChecklist"
import MonitoringChecklist from "./checklists/MonitoringChecklist"
import IntegratedMgmtChecklist from "./checklists/IntegratedMgmtChecklist"

type ChecklistComponent = React.ComponentType<{
  meta: BuildingMeta
  climateCode: string
  initial?: Record<string, unknown>
  onResult: (r: ToolResult) => void
}>

const TOOL_COMPONENTS: Record<ToolKey, ChecklistComponent> = {
  "env_opaque.html": EnvOpaqueChecklist,
  "env_trans.html": EnvTransChecklist,
  "mech_checklist.html": MechChecklist,
  "elec_checklist.html": ElecChecklist,
  "monitoring_checklist.html": MonitoringChecklist,
  "integrated_mgmt.html": IntegratedMgmtChecklist,
}

interface AssessmentWorkspaceProps {
  projectId: string
  meta: BuildingMeta
  climateCode: string
}

type SaveState = "idle" | "saving" | "success" | "error"

export default function AssessmentWorkspace({ projectId, meta, climateCode }: AssessmentWorkspaceProps) {
  const t = useTranslations("assessment")

  const [loading, setLoading] = useState(true)
  const [initialInputs, setInitialInputs] = useState<Record<string, Record<string, unknown>>>({})
  const [results, setResults] = useState<Record<string, ToolResult>>({})
  const [openTool, setOpenTool] = useState<ToolKey | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const assessment = await projectsApi.getAssessment(projectId)
        if (cancelled) return
        const parsedInputs: Record<string, Record<string, unknown>> = {}
        const parsedResults: Record<string, ToolResult> = {}
        try {
          if (assessment.inputJson) {
            Object.assign(parsedInputs, JSON.parse(assessment.inputJson))
          }
        } catch {
          // ignore malformed inputJson
        }
        try {
          if (assessment.resultJson) {
            const raw = JSON.parse(assessment.resultJson) as Record<
              string,
              { score: number; maxScore: number; title?: string }
            >
            Object.entries(raw).forEach(([toolKey, r]) => {
              parsedResults[toolKey] = {
                toolKey: toolKey as ToolKey,
                score: r.score,
                maxScore: r.maxScore,
              }
            })
          }
        } catch {
          // ignore malformed resultJson
        }
        setInitialInputs(parsedInputs)
        setResults(parsedResults)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          // non-404 errors: log but still allow a fresh assessment
          console.error("Failed to load assessment", err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleResult = (result: ToolResult) => {
    setResults((prev) => {
      const existing = prev[result.toolKey]
      if (
        existing &&
        existing.score === result.score &&
        existing.maxScore === result.maxScore &&
        JSON.stringify(existing.details) === JSON.stringify(result.details)
      ) {
        return prev
      }
      return { ...prev, [result.toolKey]: result }
    })
  }

  const totalScore = useMemo(
    () => Object.values(results).reduce((sum, r) => sum + (r.score || 0), 0),
    [results]
  )

  const handleSave = async () => {
    setSaveState("saving")
    try {
      const inputMap: Record<string, unknown> = {}
      const resultMap: Record<string, { score: number; maxScore: number; title: string }> = {}
      ASSESSMENT_SECTIONS.forEach((section) => {
        section.tools.forEach((tool) => {
          const r = results[tool.toolKey]
          if (r) {
            inputMap[tool.toolKey] = r.details ?? {}
            resultMap[tool.toolKey] = {
              score: r.score,
              maxScore: r.maxScore,
              title: tool.name,
            }
          }
        })
      })
      await projectsApi.saveAssessment(projectId, {
        inputJson: JSON.stringify(inputMap),
        resultJson: JSON.stringify(resultMap),
        totalScore,
        maxScore: TOTAL_MAX_SCORE,
      })
      setSaveState("success")
    } catch (err) {
      console.error("Failed to save assessment", err)
      setSaveState("error")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{t("totalScore")}</span>
          <span className="text-2xl font-bold text-brand-700">
            {totalScore} {t("of")} {TOTAL_MAX_SCORE}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "success" ? (
            <Alert variant="success">{t("saveSuccess")}</Alert>
          ) : saveState === "error" ? (
            <Alert variant="error">{t("saveError")}</Alert>
          ) : null}
          <Button onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? <Spinner /> : null}
            {t("save")}
          </Button>
        </div>
      </div>

      {ASSESSMENT_SECTIONS.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: section.color }} />
              <span className="font-semibold text-slate-800">{section.title}</span>
            </div>
            {section.reminder ? (
              <p className="mt-2 text-xs text-amber-700">{section.reminder}</p>
            ) : null}
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3">
              {section.tools.map((tool) => {
                const Comp = TOOL_COMPONENTS[tool.toolKey]
                const isOpen = openTool === tool.toolKey
                const r = results[tool.toolKey]
                return (
                  <div key={tool.toolKey} className="rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-800">{tool.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge tone="slate">{tool.code}</Badge>
                          <Badge tone={r && r.score > 0 ? "green" : "slate"}>
                            {t("score")}: {r?.score ?? 0} / {tool.maxScore}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant={isOpen ? "outline" : "primary"}
                        size="sm"
                        onClick={() => setOpenTool(isOpen ? null : tool.toolKey)}
                      >
                        {isOpen ? t("closeTool") : t("openTool")}
                      </Button>
                    </div>
                    {isOpen ? (
                      <div className="border-t border-slate-100 px-4 py-4">
                        <Comp
                          meta={meta}
                          climateCode={climateCode}
                          initial={initialInputs[tool.toolKey]}
                          onResult={handleResult}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
