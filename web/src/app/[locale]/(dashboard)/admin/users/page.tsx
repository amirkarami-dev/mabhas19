"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth-context"
import { adminApi } from "@/lib/endpoints"
import { ApiError } from "@/lib/api"
import type {
  AdminUser,
  CreateUserInput,
  SubscriptionPlan,
  UpdateUserSubscriptionInput,
} from "@/lib/types"
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Spinner,
  cn,
} from "@/components/ui"
import { AdminModal } from "../_components/admin-modal"

const PLANS: SubscriptionPlan[] = ["Free", "Pro", "Enterprise"]

// Bilingual string picker.
function bi(fa: boolean, faText: string, enText: string): string {
  return fa ? faText : enText
}

// Pull a human-readable message out of an ApiError 400 body.
function extractApiMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body
    if (typeof body === "string" && body.trim()) return body
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>
      if (typeof obj.title === "string" && obj.title.trim()) return obj.title
      if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail
      const errs = obj.errors
      if (errs && typeof errs === "object") {
        const msgs = Object.values(errs as Record<string, unknown>)
          .flatMap((v) => (Array.isArray(v) ? v : [v]))
          .filter((v): v is string => typeof v === "string")
        if (msgs.length) return msgs.join(" ")
      }
    }
  }
  return fallback
}

// Format an ISO date for a date <input> (yyyy-MM-dd).
function toDateInput(value?: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export default function AdminUsersPage() {
  const locale = useLocale()
  const fa = locale === "fa"
  const { ready, isAdmin } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // create-user modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserInput>({
    email: "",
    password: "",
    isAdmin: false,
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // edit-subscription modal
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<UpdateUserSubscriptionInput>({
    plan: "Free",
    maxProjects: 0,
    isActive: true,
    validTo: null,
  })
  const [editError, setEditError] = useState<string | null>(null)
  const [savingSub, setSavingSub] = useState(false)

  // per-row busy state (role toggle / delete)
  const [busyId, setBusyId] = useState<string | null>(null)

  const errText = bi(fa, "خطایی رخ داد", "Something went wrong")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await adminApi.listUsers()
      setUsers(list)
    } catch (err) {
      setError(extractApiMessage(err, errText))
    } finally {
      setLoading(false)
    }
  }, [errText])

  useEffect(() => {
    if (ready && isAdmin) void load()
  }, [ready, isAdmin, load])

  // ---- create ----
  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      await adminApi.createUser(createForm)
      setCreateOpen(false)
      setCreateForm({ email: "", password: "", isAdmin: false })
      await load()
    } catch (err) {
      setCreateError(extractApiMessage(err, errText))
    } finally {
      setCreating(false)
    }
  }

  // ---- edit subscription ----
  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setEditError(null)
    setEditForm({
      plan: (u.plan as SubscriptionPlan) || "Free",
      maxProjects: u.maxProjects ?? 0,
      isActive: u.isActive,
      validTo: toDateInput(u.validTo) || null,
    })
  }

  const handleSaveSub = async () => {
    if (!editUser) return
    setSavingSub(true)
    setEditError(null)
    try {
      await adminApi.updateSubscription(editUser.id, {
        plan: editForm.plan,
        maxProjects: Number(editForm.maxProjects) || 0,
        isActive: editForm.isActive,
        validTo: editForm.validTo || null,
      })
      setEditUser(null)
      await load()
    } catch (err) {
      setEditError(extractApiMessage(err, errText))
    } finally {
      setSavingSub(false)
    }
  }

  // ---- role toggle ----
  const handleToggleRole = async (u: AdminUser) => {
    setBusyId(u.id)
    setError(null)
    try {
      await adminApi.setRole(u.id, !u.isAdmin)
      await load()
    } catch (err) {
      setError(extractApiMessage(err, errText))
    } finally {
      setBusyId(null)
    }
  }

  // ---- delete ----
  const handleDelete = async (u: AdminUser) => {
    const msg = bi(
      fa,
      `کاربر «${u.email}» حذف شود؟`,
      `Delete user "${u.email}"?`
    )
    if (!window.confirm(msg)) return
    setBusyId(u.id)
    setError(null)
    try {
      await adminApi.removeUser(u.id)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (err) {
      setError(extractApiMessage(err, errText))
    } finally {
      setBusyId(null)
    }
  }

  // ---- access guard ----
  if (ready && !isAdmin) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </span>
          <div>
            <p className="text-base font-bold">{bi(fa, "دسترسی غیرمجاز", "Forbidden")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bi(fa, "شما به این بخش دسترسی ندارید.", "You do not have access to this section.")}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              {bi(fa, "بازگشت به داشبورد", "Back to dashboard")}
            </Button>
          </Link>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">
          {bi(fa, "کاربران و اشتراک‌ها", "Users & subscriptions")}
        </h1>
        <Button
          onClick={() => {
            setCreateError(null)
            setCreateForm({ email: "", password: "", isAdmin: false })
            setCreateOpen(true)
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {bi(fa, "کاربر جدید", "New user")}
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Card>
        <CardBody className="p-0">
          {loading || !ready ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Spinner className="text-primary" />
              {bi(fa, "در حال بارگذاری…", "Loading…")}
            </div>
          ) : users.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-muted-foreground">
              {bi(fa, "هیچ کاربری یافت نشد.", "No users found.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "ایمیل", "Email")}</th>
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "نقش", "Role")}</th>
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "پلن", "Plan")}</th>
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "سقف پروژه", "Max projects")}</th>
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "مصرف‌شده", "Used")}</th>
                    <th className="px-5 py-3 text-start font-medium">{bi(fa, "وضعیت", "Status")}</th>
                    <th className="px-5 py-3 text-end font-medium">{bi(fa, "عملیات", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="px-5 py-3 font-medium text-foreground" dir="ltr">{u.email}</td>
                      <td className="px-5 py-3">
                        {u.isAdmin ? (
                          <Badge tone="brand">{bi(fa, "ادمین", "Admin")}</Badge>
                        ) : (
                          <Badge tone="slate">{bi(fa, "کاربر", "User")}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{u.plan || "-"}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.maxProjects}</td>
                      <td className="px-5 py-3 text-muted-foreground">{u.usedProjects}</td>
                      <td className="px-5 py-3">
                        {u.isActive ? (
                          <Badge tone="green">{bi(fa, "فعال", "Active")}</Badge>
                        ) : (
                          <Badge tone="red">{bi(fa, "غیرفعال", "Inactive")}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                            {bi(fa, "ویرایش اشتراک", "Edit subscription")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === u.id}
                            onClick={() => handleToggleRole(u)}
                          >
                            {busyId === u.id ? (
                              <Spinner />
                            ) : u.isAdmin ? (
                              bi(fa, "تبدیل به کاربر", "Make user")
                            ) : (
                              bi(fa, "تبدیل به ادمین", "Make admin")
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={busyId === u.id}
                            onClick={() => handleDelete(u)}
                          >
                            {busyId === u.id ? <Spinner /> : bi(fa, "حذف", "Delete")}
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

      {/* Create user */}
      <AdminModal
        title={bi(fa, "کاربر جدید", "New user")}
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
      >
        {createError ? (
          <Alert variant="error" className="mb-4">
            {createError}
          </Alert>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleCreate()
          }}
        >
          <Field label={bi(fa, "ایمیل", "Email")}>
            <Input
              type="email"
              required
              dir="ltr"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label={bi(fa, "گذرواژه", "Password")}>
            <Input
              type="password"
              required
              dir="ltr"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              checked={createForm.isAdmin}
              onChange={(e) => setCreateForm((f) => ({ ...f, isAdmin: e.target.checked }))}
            />
            {bi(fa, "دسترسی مدیریت (ادمین)", "Administrator")}
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              {bi(fa, "انصراف", "Cancel")}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? <Spinner /> : bi(fa, "ایجاد", "Create")}
            </Button>
          </div>
        </form>
      </AdminModal>

      {/* Edit subscription */}
      <AdminModal
        title={bi(fa, "ویرایش اشتراک", "Edit subscription")}
        open={Boolean(editUser)}
        onClose={() => (savingSub ? undefined : setEditUser(null))}
      >
        {editUser ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground" dir="ltr">
              {editUser.email}
            </p>
            {editError ? (
              <Alert variant="error" className="mb-4">
                {editError}
              </Alert>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSaveSub()
              }}
            >
              <Field label={bi(fa, "پلن", "Plan")}>
                <Select
                  value={editForm.plan}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, plan: e.target.value as SubscriptionPlan }))
                  }
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={bi(fa, "سقف پروژه", "Max projects")}>
                <Input
                  type="number"
                  min={0}
                  value={editForm.maxProjects}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, maxProjects: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field label={bi(fa, "اعتبار تا", "Valid to")}>
                <Input
                  type="date"
                  value={editForm.validTo ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, validTo: e.target.value || null }))
                  }
                />
              </Field>
              <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className={cn("size-4 rounded border-input accent-primary")}
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                {bi(fa, "اشتراک فعال", "Active")}
              </label>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditUser(null)}
                  disabled={savingSub}
                >
                  {bi(fa, "انصراف", "Cancel")}
                </Button>
                <Button type="submit" disabled={savingSub}>
                  {savingSub ? <Spinner /> : bi(fa, "ذخیره", "Save")}
                </Button>
              </div>
            </form>
          </>
        ) : null}
      </AdminModal>
    </div>
  )
}
