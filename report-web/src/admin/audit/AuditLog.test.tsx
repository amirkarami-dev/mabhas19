import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../../i18n";
import { AuditLog } from "./AuditLog";

// ECharts uses Canvas which is not available in jsdom — mock the chart component
// so AuditLog renders its stub instead of attempting a Canvas paint.
vi.mock("./AuditCostChart", () => ({
  AuditCostChart: () => <div data-testid="audit-cost-chart" />,
}));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    roles: ["TenantAdmin"],
    isAdmin: true,
    ready: true,
    user: { id: "u", name: "Admin", email: "a@x.ir", tenantId: "acme", roles: ["TenantAdmin"] },
    login() {},
    logout() {},
    setMockRole() {},
    can: () => true,
    permissions: new Set<string>(),
  }),
}));

vi.mock("../../store/tenant-store", () => ({
  useTenantStore: (sel: (s: { currentTenantId: string | null }) => unknown) =>
    sel({ currentTenantId: "acme" }),
}));

vi.mock("../../api/queries", () => ({
  useAuditEvents: () => ({
    data: [
      {
        id: "e1",
        tenantId: "acme",
        actorId: "u1",
        actorName: "Ali",
        type: "AiRequest",
        ts: "2026-06-20T09:00:00Z",
        status: "ok",
        cost: 0.0021,
        tokens: 1840,
        detail: {
          prompt: "درآمد ماهانه",
          provider: "openai",
          model: "gpt-4o-mini",
          promptVersion: "report-gen@3",
          tokens: 1840,
          costUsd: 0.0021,
          latencyMs: 820,
          cached: false,
        },
      },
      {
        id: "e2",
        tenantId: "acme",
        actorId: "u2",
        actorName: "Sara",
        type: "FailedQuery",
        ts: "2026-06-20T09:05:00Z",
        status: "error",
      },
    ],
    isLoading: false,
  }),
  useAuditCostByTenant: () => ({
    data: [
      {
        tenantId: "acme",
        series: [
          { period: "2026-05", costUsd: 12 },
          { period: "2026-06", costUsd: 18 },
        ],
      },
    ],
    isLoading: false,
  }),
}));

function wrap(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("AuditLog", () => {
  it("lists events with actor names", () => {
    wrap(<AuditLog />);
    expect(screen.getByText("Ali")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
  });

  it("opens an AI event drawer showing prompt + model but no SQL", () => {
    wrap(<AuditLog />);
    fireEvent.click(screen.getByText("Ali"));
    expect(screen.getByText("درآمد ماهانه")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.queryByText(/SELECT|select \*/i)).not.toBeInTheDocument();
  });

  it("renders the cost chart container", () => {
    wrap(<AuditLog />);
    expect(screen.getByTestId("audit-cost-chart")).toBeInTheDocument();
  });
});
