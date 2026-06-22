import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mockApi, type AIProviderRow, type UserRow, type AuditRow } from "./mockApi";
import type { ReportDefinition } from "../contracts/report-definition";
import type { Tenant } from "../contracts/tenant";
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
