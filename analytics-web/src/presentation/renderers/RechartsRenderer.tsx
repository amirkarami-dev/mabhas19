import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ReportView } from "../../contracts/presentation";
import type { ReportDefinition } from "../../contracts/report-definition";
import type { QueryResult, ResultRow, GroupNode } from "../../contracts/dataset";
import { formatNumber, type Dir } from "../format";
import { aggregateByCategory } from "./chart-utils";

export type RendererProps = {
  view: ReportView;
  def: ReportDefinition;
  result: QueryResult;
  /** Optional drill callback (Task 13 canonical prop): fired with the clicked
   *  group node so the consumer can re-run `drillInto`. */
  onDrill?: (node: GroupNode) => void;
};

const PALETTE = [
  "var(--chart-1, #10b981)",
  "var(--chart-2, #3b82f6)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #ef4444)",
  "var(--chart-5, #8b5cf6)",
  "var(--chart-6, #14b8a6)",
];

function currentDir(): Dir {
  if (typeof document !== "undefined" && document.documentElement.dir === "rtl") {
    return "rtl";
  }
  return "ltr";
}

function yKeys(view: ReportView): string[] {
  const y = view.mapping.y;
  if (Array.isArray(y)) return y;
  if (typeof y === "string") return [y];
  if (view.mapping.measure) return [view.mapping.measure];
  return [];
}

export default function RechartsRenderer({ view, result, onDrill }: RendererProps) {
  const dir = currentDir();
  const rawRows = result.rows as ResultRow[];
  const x = view.mapping.x ?? "";
  const ys = yKeys(view);
  const kind = view.component || view.type;
  const numFmt = (v: number) => formatNumber(v, dir);
  const legendAlign: "left" | "right" = dir === "rtl" ? "right" : "left";
  // Map a clicked datum back to its engine group node (drill source); no-op without onDrill or groups.
  const handleClick = (index: number) => {
    const node = result.groups?.[index];
    if (onDrill && node) onDrill(node);
  };

  if (kind === "PieChart" || kind === "pie") {
    const category = view.mapping.category ?? x;
    const measure = view.mapping.measure ?? ys[0] ?? "";
    const data = aggregateByCategory(rawRows, category, measure ? [measure] : []);
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Tooltip formatter={(v: number) => numFmt(v)} />
          <Legend align={legendAlign} />
          <Pie
            data={data}
            dataKey={measure}
            nameKey={category}
            outerRadius={110}
            isAnimationActive={false}
            label
          >
            {data.map((_row, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "LineChart" || kind === "line") {
    const data = aggregateByCategory(rawRows, x, ys);
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} reversed={dir === "rtl"} />
          <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} />
          <Tooltip formatter={(v: number) => numFmt(v)} />
          <Legend align={legendAlign} />
          {ys.map((yk, i) => (
            <Line
              key={yk}
              type="monotone"
              dataKey={yk}
              stroke={PALETTE[i % PALETTE.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "AreaChart" || kind === "area") {
    const data = aggregateByCategory(rawRows, x, ys);
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={x} reversed={dir === "rtl"} />
          <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} />
          <Tooltip formatter={(v: number) => numFmt(v)} />
          <Legend align={legendAlign} />
          {ys.map((yk, i) => (
            <Area
              key={yk}
              type="monotone"
              dataKey={yk}
              stroke={PALETTE[i % PALETTE.length]}
              fill={PALETTE[i % PALETTE.length]}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // default: BarChart
  const data = aggregateByCategory(rawRows, x, ys);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        onClick={(e: { activeTooltipIndex?: number }) => {
          if (typeof e?.activeTooltipIndex === "number") handleClick(e.activeTooltipIndex);
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={x} reversed={dir === "rtl"} />
        <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} />
        <Tooltip formatter={(v: number) => numFmt(v)} />
        <Legend align={legendAlign} />
        {ys.map((yk, si) => (
          <Bar key={yk} dataKey={yk} fill={PALETTE[si % PALETTE.length]}>
            {data.map((_row, ri) => (
              <Cell key={`${yk}-${ri}`} fill={PALETTE[si % PALETTE.length]} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
