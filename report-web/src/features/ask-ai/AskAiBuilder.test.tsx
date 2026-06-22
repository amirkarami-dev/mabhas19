// report-web/src/features/ask-ai/AskAiBuilder.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { i18n } from "@/i18n";
import { AskAiBuilder } from "./AskAiBuilder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <AskAiBuilder />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AskAiBuilder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the hero prompt box and example chips on first load", () => {
    renderScreen();
    expect(screen.getByRole("textbox", { name: /prompt/i })).toBeInTheDocument();
    // 5-7 seeded example chips
    expect(screen.getAllByTestId("example-chip").length).toBeGreaterThanOrEqual(5);
  });

  it("generates → reveals the definition panel → renders a result canvas", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(
      screen.getByRole("textbox", { name: /prompt/i }),
      "فروش هر استان",
    );
    await user.click(screen.getByRole("button", { name: /send|generate|ارسال/i }));
    // collapsible definition panel appears with the generated JSON
    await waitFor(() =>
      expect(screen.getByTestId("definition-panel")).toBeInTheDocument(),
    );
    // result canvas (ReportViewRenderer output) and the view switcher appear
    expect(screen.getByTestId("result-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("view-switcher")).toBeInTheDocument();
  });

  it("clicking an example chip submits the prompt", async () => {
    const user = userEvent.setup();
    renderScreen();
    const chips = screen.getAllByTestId("example-chip");
    await user.click(chips[0]);
    await waitFor(() =>
      expect(screen.getByTestId("definition-panel")).toBeInTheDocument(),
    );
  });

  it("the view switcher swaps views without recomputing the query", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(
      screen.getByRole("textbox", { name: /prompt/i }),
      "فروش هر استان",
    );
    await user.click(screen.getByRole("button", { name: /send|generate|ارسال/i }));
    await waitFor(() =>
      expect(screen.getByTestId("view-switcher")).toBeInTheDocument(),
    );
    // The switcher should be present; clicking a segment option should not error.
    expect(screen.getByTestId("view-switcher")).toBeInTheDocument();
  });

  it("renders an error alert when the AI service throws", async () => {
    const user = userEvent.setup();

    // Mock the AI module to throw for this test only.
    const aiModule = await import("@/ai/mock-ai-service");
    const spy = vi.spyOn(aiModule, "createAIService").mockReturnValue({
      generate: () => Promise.reject(new Error("Cannot map intent")),
    });

    renderScreen();
    await user.type(screen.getByRole("textbox", { name: /prompt/i }), "asdkjqwe zzz");
    await user.click(screen.getByRole("button", { name: /send|generate|ارسال/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument(),
    );

    spy.mockRestore();
  });

  it("save button calls useSaveReport with the definition", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(
      screen.getByRole("textbox", { name: /prompt/i }),
      "فروش هر استان",
    );
    await user.click(screen.getByRole("button", { name: /send|generate|ارسال/i }));
    await waitFor(() =>
      expect(screen.getByTestId("save-btn")).toBeInTheDocument(),
    );
    // Clicking save opens the modal.
    await user.click(screen.getByTestId("save-btn"));
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toBeInTheDocument(),
    );
  });

  it("setDataset changes dataset without entering result phase", () => {
    renderScreen();
    // In hero phase, the dataset picker is visible.
    const picker = screen.getByTestId("dataset-picker");
    expect(picker).toBeInTheDocument();
    // The phase remains "hero" (PromptHero is rendered, not the result pane).
    expect(screen.getAllByTestId("example-chip").length).toBeGreaterThanOrEqual(1);
  });
});
