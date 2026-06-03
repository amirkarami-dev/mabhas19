import { apiFetch } from "./api"
import type {
  AdminUser,
  Assessment,
  CreateProjectInput,
  CreateUserInput,
  CurrentUser,
  Project,
  Subscription,
  UpdateUserSubscriptionInput,
} from "./types"

// ---- Auth ----
export const authApi = {
  me: () => apiFetch<CurrentUser>("/api/Users/me"),
}

// ---- Subscriptions ----
export const subscriptionApi = {
  me: () => apiFetch<Subscription>("/api/Subscriptions/me"),
}

// ---- Admin (requires Administrator role) ----
export const adminApi = {
  listUsers: () => apiFetch<AdminUser[]>("/api/Admin/users"),

  getUser: (id: string) => apiFetch<AdminUser>(`/api/Admin/users/${id}`),

  createUser: (input: CreateUserInput) =>
    apiFetch<{ id: string }>("/api/Admin/users", {
      method: "POST",
      body: input,
    }),

  updateSubscription: (id: string, input: UpdateUserSubscriptionInput) =>
    apiFetch(`/api/Admin/users/${id}/subscription`, {
      method: "PUT",
      body: input,
    }),

  setRole: (id: string, isAdmin: boolean) =>
    apiFetch(`/api/Admin/users/${id}/role`, {
      method: "PUT",
      body: { isAdmin },
    }),

  removeUser: (id: string) =>
    apiFetch(`/api/Admin/users/${id}`, { method: "DELETE" }),
}

// ---- Projects ----
export const projectsApi = {
  list: () => apiFetch<Project[]>("/api/Projects"),

  get: (id: string) => apiFetch<Project>(`/api/Projects/${id}`),

  create: (input: CreateProjectInput) =>
    apiFetch<{ id: string }>("/api/Projects", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateProjectInput>) =>
    apiFetch(`/api/Projects/${id}`, { method: "PUT", body: input }),

  remove: (id: string) =>
    apiFetch(`/api/Projects/${id}`, { method: "DELETE" }),

  getAssessment: (id: string) =>
    apiFetch<Assessment>(`/api/Projects/${id}/assessment`),

  saveAssessment: (id: string, assessment: Assessment) =>
    apiFetch(`/api/Projects/${id}/assessment`, {
      method: "PUT",
      body: assessment,
    }),

  report: (id: string) =>
    apiFetch<{ downloadUrl: string }>(`/api/Projects/${id}/report`, {
      method: "POST",
    }),

  importProject: (source: string, externalId: string) =>
    apiFetch<{ id: string }>("/api/Projects/import", {
      method: "POST",
      body: { source, externalId },
    }),
}
