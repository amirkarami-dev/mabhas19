"use client"

import { useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { projectsApi } from "@/lib/endpoints"
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Spinner,
} from "@/components/ui"

export default function ImportPage() {
  const t = useTranslations("import")
  const tc = useTranslations("common")
  const router = useRouter()

  const [source, setSource] = useState("NezamMohandesi")
  const [externalId, setExternalId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!externalId.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await projectsApi.importProject(source, externalId.trim())
      setSuccess(true)
      if (res?.id) router.push(`/projects/${res.id}`)
    } catch {
      setError(tc("error"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-bold text-slate-900">{t("title")}</h1>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold text-slate-900">{t("title")}</h2>
        </CardHeader>
        <CardBody>
          {success ? (
            <Alert variant="success" className="mb-4">
              {t("success")}
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <Field label={t("source")}>
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="NezamMohandesi">{t("sourceNezam")}</option>
              </Select>
            </Field>
            <Field label={t("externalId")}>
              <Input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                dir="ltr"
                className="text-start"
                required
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || !externalId.trim()}>
                {submitting ? <Spinner /> : null}
                {t("submit")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
