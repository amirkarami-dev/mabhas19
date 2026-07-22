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
import { useUiStore } from "../../store/ui-store";
import { chartColors } from "../../theme/tokens";

export type RendererProps = {
  view: ReportView;
  def: ReportDefinition;
  result: QueryResult;
  /** Optional drill callback (Task 13 canonical prop): fired with the clicked
   *  group node so the consumer can re-run `drillInto`. */
  onDrill?: (node: GroupNode) => void;
};

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
  const themeMode = useUiStore((s) => s.themeMode);
  const colors = chartColors(themeMode);
  const palette = colors.series;
  const rawRows = result.rows as ResultRow[];
  const x = view.mapping.x ?? "";
  const ys = yKeys(view);
  const kind = view.component || view.type;
  const numFmt = (v: number) => formatNumber(v, dir);
  const legendAlign: "left" | "right" = dir === "rtl" ? "right" : "left";
  // Recharts' default tooltip surface is white — with our light text colour that made
  // dark-mode tooltips white-on-white. Theme the surface AND both text layers (the header
  // uses labelStyle, the value rows use itemStyle; contentStyle.color alone covers neither).
  const tooltipProps = {
    formatter: (v: number) => numFmt(v),
    contentStyle: {
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 8,
      color: colors.text,
    },
    labelStyle: { color: colors.text },
    itemStyle: { color: colors.text },
  } as const;
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
          <Tooltip {...tooltipProps} />
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
              <Cell key={i} fill={palette[i % palette.length]} />
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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey={x} reversed={dir === "rtl"} tick={{ fill: colors.axis }} stroke={colors.axis} />
          <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} tick={{ fill: colors.axis }} stroke={colors.axis} />
          <Tooltip {...tooltipProps} />
          <Legend align={legendAlign} />
          {ys.map((yk, i) => (
            <Line
              key={yk}
              type="monotone"
              dataKey={yk}
              stroke={palette[i % palette.length]}
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
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
          <XAxis dataKey={x} reversed={dir === "rtl"} tick={{ fill: colors.axis }} stroke={colors.axis} />
          <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} tick={{ fill: colors.axis }} stroke={colors.axis} />
          <Tooltip {...tooltipProps} />
          <Legend align={legendAlign} />
          {ys.map((yk, i) => (
            <Area
              key={yk}
              type="monotone"
              dataKey={yk}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
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
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis dataKey={x} reversed={dir === "rtl"} tick={{ fill: colors.axis }} stroke={colors.axis} />
        <YAxis orientation={dir === "rtl" ? "right" : "left"} tickFormatter={numFmt} tick={{ fill: colors.axis }} stroke={colors.axis} />
        <Tooltip {...tooltipProps} />
        <Legend align={legendAlign} />
        {ys.map((yk, si) => (
          <Bar key={yk} dataKey={yk} fill={palette[si % palette.length]}>
            {data.map((_row, ri) => (
              <Cell key={`${yk}-${ri}`} fill={palette[si % palette.length]} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
