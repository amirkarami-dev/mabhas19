import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Recharts ResponsiveContainer measures the DOM; jsdom reports 0x0.
// Force a fixed size so child charts actually render their SVG.
// We also clone children with explicit width/height so recharts renders fully.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const React = await import("react");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      const child = React.Children.only(children) as React.ReactElement<{ width?: number; height?: number }>;
      return (
        <div style={{ width: 400, height: 300 }}>
          {React.cloneElement(child, { width: 400, height: 300 })}
        </div>
      );
    },
  };
});

import RechartsRenderer from "./RechartsRenderer";
import type { ReportView } from "../../contracts/presentation";
import type { ReportDefinition } from "../../contracts/report-definition";
import type { QueryResult } from "../../contracts/dataset";

const result: QueryResult = {
  columns: [
    { key: "province", label: "استان", type: "string", isMetric: false },
    { key: "revenue", label: "درآمد", type: "number", isMetric: true },
  ],
  rows: [
    { province: "Tehran", revenue: 1200 },
    { province: "Fars", revenue: 800 },
    { province: "Isfahan", revenue: 600 },
  ],
  total: 3,
};

const def = {
  id: "r1",
  dataset: "sales",
  columns: [],
  presentation: { views: [] },
} as unknown as ReportDefinition;

function makeView(component: string): ReportView {
  return {
    type: "chart",
    library: "recharts",
    component,
    mapping: { x: "province", y: ["revenue"], category: "province", measure: "revenue" },
  };
}

describe("RechartsRenderer", () => {
  it("renders a bar chart with an SVG and the right number of bars", () => {
    const { container } = render(
      <RechartsRenderer view={makeView("BarChart")} def={def} result={result} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    // one <rect> bar per data row inside the bar layer
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBe(3);
  });

  it("renders a line chart as an SVG path", () => {
    const { container } = render(
      <RechartsRenderer view={makeView("LineChart")} def={def} result={result} />,
    );
    expect(container.querySelector(".recharts-line")).toBeTruthy();
  });

  it("renders a pie chart with one slice per category", () => {
    const { container } = render(
      <RechartsRenderer view={makeView("PieChart")} def={def} result={result} />,
    );
    expect(container.querySelectorAll(".recharts-pie-sector").length).toBe(3);
  });
});
