import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TableRenderer from "./TableRenderer";
import type { ReportView } from "../../contracts/presentation";
import type { ReportDefinition } from "../../contracts/report-definition";
import type { QueryResult } from "../../contracts/dataset";

const result: QueryResult = {
  columns: [
    { key: "province", label: "استان", type: "string", isMetric: false },
    { key: "revenue", label: "درآمد", type: "number", isMetric: true },
  ],
  rows: [
    { province: "Tehran", revenue: 1234567 },
    { province: "Fars", revenue: 890000 },
  ],
  total: 2,
};

const def = {
  id: "r1",
  dataset: "sales",
  columns: [],
  presentation: { views: [] },
} as unknown as ReportDefinition;

const view: ReportView = {
  type: "table",
  library: "antd",
  component: "TableRenderer",
  mapping: {},
};

describe("TableRenderer", () => {
  it("renders headers and formatted cells (LTR default)", () => {
    render(<TableRenderer view={view} def={def} result={result} />);
    expect(screen.getByText("استان")).toBeInTheDocument();
    expect(screen.getByText("درآمد")).toBeInTheDocument();
    expect(screen.getByText("Tehran")).toBeInTheDocument();
    // number cell grouped, ASCII in LTR
    expect(screen.getByText("1,234,567")).toBeInTheDocument();
  });

  it("honors a restricted mapping.columns subset", () => {
    const subset: ReportView = { ...view, mapping: { columns: ["province"] } };
    render(<TableRenderer view={subset} def={def} result={result} />);
    expect(screen.getByText("استان")).toBeInTheDocument();
    expect(screen.queryByText("درآمد")).not.toBeInTheDocument();
  });

  it("renders without onDrill prop (no crash)", () => {
    render(<TableRenderer view={view} def={def} result={result} />);
    expect(screen.getByText("Fars")).toBeInTheDocument();
  });

  it("accepts onDrill callback prop without crashing", () => {
    const onDrill = vi.fn();
    render(<TableRenderer view={view} def={def} result={result} onDrill={onDrill} />);
    expect(screen.getByText("Tehran")).toBeInTheDocument();
  });
});
