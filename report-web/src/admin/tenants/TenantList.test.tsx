import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../../i18n";
import * as antd from "antd";
import { TenantList } from "./TenantList";

const setStatus = vi.fn();

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    roles: ["SuperAdmin"],
    isAdmin: true,
    ready: true,
    user: { id: "u" },
    login() {},
    logout() {},
    setMockRole() {},
    can: () => true,
    permissions: new Set<string>(),
  }),
}));

vi.mock("../../api/queries", () => ({
  useTenants: () => ({
    data: [
      {
        id: "acme",
        slug: "acme-co",
        displayName: "شرکت آلفا",
        status: "active",
        plan: "pro",
        branding: { primaryColor: "#10b981" },
        aiConfig: {},
        quotas: {},
        dataSourceIds: [],
        defaultLocale: "fa-IR",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "beta",
        slug: "beta-log",
        displayName: "Beta Logistics",
        status: "trial",
        plan: "free",
        branding: { primaryColor: "#2563eb" },
        aiConfig: {},
        quotas: {},
        dataSourceIds: [],
        defaultLocale: "en-US",
        createdAt: "",
        updatedAt: "",
      },
    ],
    isLoading: false,
  }),
  useUpsertTenant: () => ({ mutate: vi.fn() }),
  useSetTenantStatus: () => ({ mutate: setStatus }),
}));

function wrap(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("TenantList", () => {
  beforeEach(() => {
    // Auto-confirm Modal.confirm by immediately calling onOk
    vi.spyOn(antd.Modal, "confirm").mockImplementation(
      (cfg: Parameters<typeof antd.Modal.confirm>[0]) => {
        cfg?.onOk?.();
        return { destroy: vi.fn(), update: vi.fn() };
      },
    );
  });

  it("lists all tenants with status", () => {
    wrap(<TenantList />);
    expect(screen.getByText("شرکت آلفا")).toBeInTheDocument();
    expect(screen.getByText("Beta Logistics")).toBeInTheDocument();
  });

  it("suspends a tenant", () => {
    wrap(<TenantList />);
    fireEvent.click(screen.getAllByRole("button", { name: /suspend/i })[0]);
    expect(setStatus).toHaveBeenCalledWith({ id: "acme", status: "suspended" });
  });
});
