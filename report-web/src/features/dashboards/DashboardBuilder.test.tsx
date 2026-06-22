import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { setMockUser } from "@/auth/mock-user";
import { i18n } from "@/i18n";
import { resetMockDb, seedReports, seedDashboards, firstSeededDashboardId } from "@/api/seed";
import { DashboardBuilder } from "./DashboardBuilder";

function renderBuilder(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/dashboards/${id}/edit`]}>
            <Routes>
              <Route path="/dashboards/:dashId/edit" element={<DashboardBuilder />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("DashboardBuilder", () => {
  beforeEach(() => {
    resetMockDb();
    seedReports();
    seedDashboards();
    // Set role so canEdit passes (DashboardDesigner is in the allowed list)
    setMockUser(["DashboardDesigner"]);
  });

  it("renders the canvas with the saved widgets", async () => {
    renderBuilder(firstSeededDashboardId());
    await waitFor(() =>
      expect(screen.getByTestId("dashboard-canvas")).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId("dashboard-widget").length).toBeGreaterThan(0);
  });

  it("adds a widget via the drawer (binds to a saved report)", async () => {
    const user = userEvent.setup();
    renderBuilder(firstSeededDashboardId());
    await screen.findByTestId("dashboard-canvas");
    const before = screen.getAllByTestId("dashboard-widget").length;
    // Click "Add widget" button
    const addButtons = screen.getAllByRole("button", { name: /add widget|افزودن ویجت/i });
    await user.click(addButtons[0]);
    // Wait for drawer items to appear
    const items = await screen.findAllByTestId("add-widget-item");
    await user.click(items[0]);
    await waitFor(() =>
      expect(screen.getAllByTestId("dashboard-widget").length).toBe(before + 1),
    );
  });
});
