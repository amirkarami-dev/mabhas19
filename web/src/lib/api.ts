import { env } from "./env"
import { beginLoading, endLoading } from "./loading"
import { tokenStore } from "./tokens"
import type { TokenResponse } from "./types"

export const API_BASE = env.apiBase

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  // when true, do not attach Authorization header (used by login/register/refresh)
  skipAuth?: boolean
  // internal: prevents infinite refresh loops
  _retried?: boolean
}

// Track an in-flight refresh so concurrent 401s share one refresh call.
let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/api/Users/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      tokenStore.clear()
      return false
    }
    const data = (await res.json()) as TokenResponse
    tokenStore.set(data)
    return true
  } catch {
    tokenStore.clear()
    return false
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function apiFetchInner<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, skipAuth = false, _retried = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"

  if (!skipAuth) {
    const token = tokenStore.getAccess()
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Auto-refresh on 401 (once).
  if (res.status === 401 && !skipAuth && !_retried) {
    const ok = await refreshOnce()
    if (ok) {
      return apiFetchInner<T>(path, { ...options, _retried: true })
    }
  }

  if (!res.ok) {
    let parsed: unknown = null
    try {
      parsed = await res.json()
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(res.status, `Request failed: ${res.status}`, parsed)
  }

  // Some endpoints (logout, 204) return no content.
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

// Public wrapper: drives the global top loading bar for the whole request
// (including the one-shot 401 refresh + retry, which calls the inner fn).
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  beginLoading()
  try {
    return await apiFetchInner<T>(path, options)
  } finally {
    endLoading()
  }
}
