import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../../i18n";
import * as antd from "antd";
import { SystemSettings } from "./SystemSettings";

const mutate = vi.fn();

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
  useSystemSettings: () => ({
    data: {
      defaultLocale: "fa-IR",
      defaultTheme: "light",
      dateSystem: "jalali",
      flags: { advancedECharts: true, dashboardSharing: false, exportFormats: true },
      ai: {
        defaultProvider: "openai",
        defaultModel: "gpt-4o-mini",
        globalTokenBudget: 10000000,
        defaultCacheTtl: 86400,
        promptVersionPin: "report-gen@3",
      },
      security: {
        sessionPolicy: "8h",
        allowedExportFormats: ["pdf", "csv"],
        piiRedaction: true,
      },
      integrations: { oidcIssuer: "https://auth.myceo.ir" },
    },
    isLoading: false,
  }),
  useUpdateSystemSettings: () => ({ mutate, isPending: false }),
}));

function wrap(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe("SystemSettings", () => {
  beforeEach(() => {
    // Auto-confirm Modal.confirm by immediately calling onOk
    vi.spyOn(antd.Modal, "confirm").mockImplementation(
      (cfg: Parameters<typeof antd.Modal.confirm>[0]) => {
        cfg?.onOk?.();
        return { destroy: vi.fn(), update: vi.fn() };
      },
    );
  });

  it("shows the read-only OIDC issuer", () => {
    wrap(<SystemSettings />);
    // Navigate to the Integrations tab
    fireEvent.click(screen.getByText(/integrations/i));
    expect(screen.getByDisplayValue("https://auth.myceo.ir")).toBeInTheDocument();
  });

  it("persists a flag change on save", async () => {
    wrap(<SystemSettings />);
    // Switch to flags tab
    fireEvent.click(screen.getByText(/feature flags/i));
    // Click the Switch button inside the data-testid span
    const flagSpan = screen.getByTestId("flag-dashboardSharing");
    const switchBtn = flagSpan.querySelector("button");
    if (switchBtn) fireEvent.click(switchBtn);
    // Click main Save button — Modal.confirm is auto-confirmed by the spy
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: expect.objectContaining({ dashboardSharing: true }),
      }),
    );
  });
});
