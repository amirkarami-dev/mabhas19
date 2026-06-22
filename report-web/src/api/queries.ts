import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mockApi, type AIProviderRow, type UserRow, type AuditRow } from "./mockApi";
import type { ReportDefinition } from "../contracts/report-definition";
import type { Tenant } from "../contracts/tenant";
import type { TenantAIConfig } from "../contracts/ai";
import type { DashboardWidget, GridLayoutItem } from "../dashboard/widget";
import { useTenantStore } from "../store/tenant-store";

// ----- Canonical persisted shapes (the single definitions; other tasks import from here) -----

/** A saved report = a ReportDefinition envelope with library metadata. */
export type SavedReport = {
  id: string;
  definition: ReportDefinition;
  updatedAt: string;
  lastRunAt?: string;
  ownerName: string;
  visibility: "private" | "tenant";
};

/** A dashboard = embedded widgets + grid layout (no separate WidgetDef). */
export type DashboardRecord = {
  id: string;
  tenantId: string;
  name: string;
  widgets: DashboardWidget[];
  layout: GridLayoutItem[];
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

// Re-export the widget/layout types so consumers can import them from @/api/queries too.
export type { DashboardWidget, GridLayoutItem };
// Re-export admin row types for convenience.
export type { AIProviderRow, UserRow, AuditRow };

// ----- Query key factory (tenant-scoped) -----
export const rk = {
  reports: (t: string | null) => ["reports", t] as const,
  report: (id: string) => ["report", id] as const,
  dashboards: (t: string | null) => ["dashboards", t] as const,
  dashboard: (id: string) => ["dashboard", id] as const,
  providers: (t: string | null) => ["providers", t] as const,
  users: (t: string | null) => ["users", t] as const,
  tenants: () => ["tenants"] as const,
  audit: (t: string | null) => ["audit", t] as const,
  tenantAIConfig: (t: string | null) => ["tenantAIConfig", t] as const,
  aiUsageSeries: (t: string | null) => ["aiUsageSeries", t] as const,
};

const useTid = () => useTenantStore((s) => s.currentTenantId);

// ----- Report hooks -----

export const useReports = () => {
  const t = useTid();
  return useQuery({
    queryKey: rk.reports(t),
    queryFn: () => mockApi.reports.list(t ?? undefined),
  });
};

export const useReport = (id: string) =>
  useQuery<SavedReport | null>({
    queryKey: rk.report(id),
    queryFn: () => mockApi.reports.get(id),
    enabled: !!id,
  });

export const useSaveReport = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation<
    SavedReport,
    Error,
    { definition: ReportDefinition; name?: string; visibility?: "private" | "tenant" }
  >({
    mutationFn: ({ definition, name, visibility }) =>
      mockApi.reports.save({
        id: definition.id ?? "",
        tenantId: t ?? "",
        definition: name ? { ...definition, name } : definition,
        ownerName: "",
        visibility: visibility ?? "private",
        updatedAt: "",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.reports(t) }),
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation({
    mutationFn: (id: string) => mockApi.reports.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.reports(t) }),
  });
};

// ----- Dashboard hooks -----

export const useDashboards = () => {
  const t = useTid();
  return useQuery({
    queryKey: rk.dashboards(t),
    queryFn: () => mockApi.dashboards.list(t ?? undefined),
  });
};

export const useDashboard = (id: string) =>
  useQuery<DashboardRecord | null>({
    queryKey: rk.dashboard(id),
    queryFn: () => mockApi.dashboards.get(id),
    enabled: !!id,
  });

export const useCreateDashboard = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation<DashboardRecord, Error, { name: string }>({
    mutationFn: ({ name }) =>
      mockApi.dashboards.save({
        id: "",
        tenantId: t ?? "",
        name,
        ownerName: "",
        widgets: [],
        layout: [],
        createdAt: "",
        updatedAt: "",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.dashboards(t) }),
  });
};

export const useSaveDashboard = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation<DashboardRecord, Error, DashboardRecord>({
    mutationFn: (d: DashboardRecord) => mockApi.dashboards.save(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.dashboards(t) }),
  });
};

export const useDeleteDashboard = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation({
    mutationFn: (id: string) => mockApi.dashboards.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.dashboards(t) }),
  });
};

// ----- Admin/meta hooks -----

export const useProviders = () => {
  const t = useTid();
  return useQuery<AIProviderRow[]>({
    queryKey: rk.providers(t),
    queryFn: () => mockApi.providers.list(t ?? undefined),
  });
};

export const useUsers = () => {
  const t = useTid();
  return useQuery<UserRow[]>({
    queryKey: rk.users(t),
    queryFn: () => mockApi.users.list(t ?? undefined),
  });
};

export const useTenants = () =>
  useQuery<Tenant[]>({
    queryKey: rk.tenants(),
    queryFn: () => mockApi.tenants.list(),
  });

export const useAudit = () => {
  const t = useTid();
  return useQuery<AuditRow[]>({
    queryKey: rk.audit(t),
    queryFn: () => mockApi.audit.list(t ?? undefined),
  });
};

// ─── TenantAIConfig hooks (Task 18) ──────────────────────────────────────────

const AI_CONFIG_STORAGE_KEY = "report.db.tenantAIConfig";

function readAIConfig(tenantId: string): TenantAIConfig | null {
  const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  if (!raw) return null;
  try {
    const all = JSON.parse(raw) as Record<string, TenantAIConfig>;
    return all[tenantId] ?? null;
  } catch {
    return null;
  }
}

function writeAIConfig(cfg: TenantAIConfig): void {
  const raw = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  let all: Record<string, TenantAIConfig> = {};
  if (raw) {
    try { all = JSON.parse(raw) as Record<string, TenantAIConfig>; } catch { /* ignore */ }
  }
  all[cfg.tenantId] = cfg;
  localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(all));
}

const DEFAULT_AI_CONFIG = (tenantId: string): TenantAIConfig => ({
  tenantId,
  defaultModelId: "openai-gpt4o-mini",
  fallbackChain: ["openai-gpt4o-mini"],
  promptVersion: "report-gen@3",
  cache: { enabled: true, ttlSeconds: 86400 },
  quota: { monthlyTokenLimit: 5_000_000, monthlyCostUsdLimit: 200 },
  providers: [
    {
      id: "openai-gpt4o-mini",
      type: "openai",
      model: "gpt-4o-mini",
      keyRef: "secret://tenant/openai",
      params: { temperature: 0.1, maxTokens: 2048 },
      enabled: true,
    },
    {
      id: "ollama-local",
      type: "ollama",
      model: "qwen2.5:14b",
      keyRef: null,
      params: { temperature: 0.1, maxTokens: 2048 },
      enabled: true,
    },
  ],
});

export const useTenantAIConfig = () => {
  const t = useTid();
  return useQuery<TenantAIConfig>({
    queryKey: rk.tenantAIConfig(t),
    queryFn: async () => {
      await new Promise<void>((r) => setTimeout(r, 100));
      return readAIConfig(t ?? "default") ?? DEFAULT_AI_CONFIG(t ?? "default");
    },
  });
};

export const useUpdateTenantAIConfig = () => {
  const qc = useQueryClient();
  const t = useTid();
  return useMutation<TenantAIConfig, Error, TenantAIConfig>({
    mutationFn: async (cfg) => {
      await new Promise<void>((r) => setTimeout(r, 100));
      writeAIConfig(cfg);
      return cfg;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rk.tenantAIConfig(t) }),
  });
};

export const useTestProvider = () => {
  return useMutation<{ ok: boolean; latencyMs: number; error?: string }, Error, string>({
    mutationFn: async (_id: string) => {
      await new Promise<void>((r) => setTimeout(r, 400));
      return { ok: true, latencyMs: 87 };
    },
  });
};

// ─── AI usage series (mock data for usage/cost chart) ─────────────────────

export interface AIUsageSeriesData {
  perDay: { date: string; tokens: number }[];
  perModel: { model: string; costUsd: number }[];
}

const MOCK_USAGE_SERIES: AIUsageSeriesData = {
  perDay: [
    { date: "2026-06-01", tokens: 12400 },
    { date: "2026-06-02", tokens: 9800 },
    { date: "2026-06-03", tokens: 15200 },
    { date: "2026-06-04", tokens: 8100 },
    { date: "2026-06-05", tokens: 18700 },
    { date: "2026-06-06", tokens: 11300 },
    { date: "2026-06-07", tokens: 14500 },
    { date: "2026-06-08", tokens: 16200 },
    { date: "2026-06-09", tokens: 9600 },
    { date: "2026-06-10", tokens: 22300 },
  ],
  perModel: [
    { model: "gpt-4o-mini", costUsd: 4.52 },
    { model: "qwen2.5:14b", costUsd: 0.0 },
    { model: "deepseek-chat", costUsd: 1.23 },
    { model: "claude-3-haiku", costUsd: 2.87 },
  ],
};

export const useAIUsageSeries = () => {
  const t = useTid();
  return useQuery<AIUsageSeriesData>({
    queryKey: rk.aiUsageSeries(t),
    queryFn: async () => {
      await new Promise<void>((r) => setTimeout(r, 150));
      return MOCK_USAGE_SERIES;
    },
    initialData: MOCK_USAGE_SERIES,
  });
};
