import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui-store";

describe("ui-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ mode: "light", locale: "fa", dir: "rtl", sidebarCollapsed: false });
  });

  it("setLocale switches dir to ltr for en", () => {
    useUiStore.getState().setLocale("en");
    expect(useUiStore.getState().locale).toBe("en");
    expect(useUiStore.getState().dir).toBe("ltr");
  });

  it("setMode toggles theme; toggleSidebar flips collapse", () => {
    useUiStore.getState().setMode("dark");
    expect(useUiStore.getState().mode).toBe("dark");
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
  });
});
