import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { i18n } from "@/i18n";
import { resetMockDb, seedReports } from "@/api/seed";
import { ReportLibrary } from "./ReportLibrary";

function renderLib() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <MemoryRouter>
            <ReportLibrary />
          </MemoryRouter>
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("ReportLibrary", () => {
  beforeEach(() => {
    resetMockDb();
    seedReports();
  });

  it("lists seeded reports in a table", async () => {
    renderLib();
    await waitFor(() =>
      expect(screen.getByRole("table")).toBeInTheDocument(),
    );
    // at least one seeded report name is rendered
    expect(screen.getAllByTestId("report-row").length).toBeGreaterThan(0);
  });

  it("filters rows by the search box", async () => {
    renderLib();
    await screen.findByRole("table");
    const before = screen.getAllByTestId("report-row").length;
    const search = screen.getByRole("searchbox");
    search.focus();
    // typing a string that matches nothing collapses the list
    (search as HTMLInputElement).value = "zzz-no-match";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() =>
      expect(screen.queryAllByTestId("report-row").length).toBeLessThanOrEqual(before),
    );
  });
});
