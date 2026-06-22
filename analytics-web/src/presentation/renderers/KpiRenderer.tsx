import { Card, Statistic, Tag } from "antd";
import type { ReportView } from "../../contracts/presentation";
import type { ReportDefinition } from "../../contracts/report-definition";
import type { QueryResult, ResolvedColumn, GroupNode } from "../../contracts/dataset";
import { formatNumber, formatCell, type Dir } from "../format";

export type RendererProps = {
  view: ReportView;
  def: ReportDefinition;
  result: QueryResult;
  /** Optional drill callback (Task 13 canonical prop); a KPI tile ignores it. */
  onDrill?: (node: GroupNode) => void;
};

function currentDir(): Dir {
  if (typeof document !== "undefined" && document.documentElement.dir === "rtl") {
    return "rtl";
  }
  return "ltr";
}

export default function KpiRenderer({ view, result }: RendererProps) {
  const dir = currentDir();
  const key =
    view.mapping.value ??
    result.columns.find((c) => c.isMetric)?.key ??
    result.columns[0]?.key;
  const col: ResolvedColumn | undefined = result.columns.find(
    (c) => c.key === key,
  );
  const label = view.title ?? col?.label ?? key ?? "";
  const row = result.rows[0] ?? {};
  const raw = key ? row[key] : null;
  const display = col ? formatCell(raw ?? null, col.type, dir) : "";

  // Optional delta vs a comparison metric.
  let delta: { text: string; up: boolean } | null = null;
  const cmpKey = view.mapping.comparison;
  if (cmpKey && typeof raw === "number") {
    const prev = row[cmpKey];
    if (typeof prev === "number" && prev !== 0) {
      const pct = ((raw - prev) / prev) * 100;
      delta = {
        text: `${formatNumber(Math.round(pct), dir)}%`,
        up: pct >= 0,
      };
    }
  }

  return (
    <Card variant="borderless" style={{ minWidth: 200 }}>
      <Statistic title={label} value={display} />
      {delta && (
        <Tag color={delta.up ? "green" : "red"} style={{ marginTop: 8 }}>
          {delta.up ? "▲" : "▼"} {delta.text}
        </Tag>
      )}
    </Card>
  );
}
