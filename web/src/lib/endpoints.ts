import { apiFetch } from "./api"
import { tokenStore } from "./tokens"
import type {
  Assessment,
  CreateProjectInput,
  Project,
  Subscription,
  TokenResponse,
  UserInfo,
} from "./types"

// ---- Auth ----
export const authApi = {
  register: (email: string, password: string) =>
    apiFetch("/api/Users/register", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    }),

  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/api/Users/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    }),

  logout: () => apiFetch("/api/Users/logout", { method: "POST" }),

  me: () => apiFetch<UserInfo>("/api/Users/manage/info"),

  requestOtp: (phoneNumber: string) =>
    apiFetch("/api/Auth/otp/request", {
      method: "POST",
      body: { phoneNumber },
      skipAuth: true,
    }),

  verifyOtp: (phoneNumber: string, code: string) =>
    apiFetch<TokenResponse>("/api/Auth/otp/verify", {
      method: "POST",
      body: { phoneNumber, code },
      skipAuth: true,
    }),

  google: (idToken: string) =>
    apiFetch<TokenResponse>("/api/Auth/google", {
      method: "POST",
      body: { idToken },
      skipAuth: true,
    }),
}

export function saveTokens(tokens: TokenResponse) {
  tokenStore.set(tokens)
}

// ---- Subscriptions ----
export const subscriptionApi = {
  me: () => apiFetch<Subscription>("/api/Subscriptions/me"),
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
