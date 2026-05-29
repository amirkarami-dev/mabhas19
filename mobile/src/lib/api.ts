// fetch wrapper with bearer auth + one-shot 401 refresh. Mirrors web/src/lib/api.ts
// but persists tokens through expo-secure-store (see tokens.ts).
import Constants from "expo-constants"
import { tokenStore } from "./tokens"
import type { TokenResponse } from "./types"

export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ||
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ||
  "https://api.mabhas19.myceo.ir"

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
  skipAuth?: boolean
  _retried?: boolean
}

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
      await tokenStore.clear()
      return false
    }
    const data = (await res.json()) as TokenResponse
    await tokenStore.set(data)
    return true
  } catch {
    await tokenStore.clear()
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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
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

  if (res.status === 401 && !skipAuth && !_retried) {
    const ok = await refreshOnce()
    if (ok) return apiFetch<T>(path, { ...options, _retried: true })
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

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
