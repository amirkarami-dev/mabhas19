import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runQuery,
  applyOperator,
  aggregate,
  resolveDynamicValue,
  dateBucketKey,
  evalExpression,
  ENGINE_TODAY,
} from "./engine";
import { projectModel } from "../semantic/models/project";
import { salesModel } from "../semantic/models/sales";
import { projectData } from "../semantic/datasets/project";
import { salesData } from "../semantic/datasets/sales";
import type { ReportDefinition } from "../contracts/report-definition";

describe("applyOperator", () => {
  it("eq / neq", () => {
    expect(applyOperator("eq", "a", "a")).toBe(true);
    expect(applyOperator("eq", "a", "b")).toBe(false);
    expect(applyOperator("neq", "a", "b")).toBe(true);
  });
  it("numeric comparisons", () => {
    expect(applyOperator("gt", 5, 3)).toBe(true);
    expect(applyOperator("gte", 3, 3)).toBe(true);
    expect(applyOperator("lt", 2, 3)).toBe(true);
    expect(applyOperator("lte", 3, 3)).toBe(true);
    expect(applyOperator("gt", 2, 3)).toBe(false);
  });
  it("date comparisons (ISO strings compare lexicographically)", () => {
    expect(applyOperator("lt", "2025-01-05", "2025-05-02")).toBe(true);
    expect(applyOperator("gte", "2025-05-02", "2025-05-02")).toBe(true);
  });
  it("between / notBetween (inclusive)", () => {
    expect(applyOperator("between", 5, 1, 10)).toBe(true);
    expect(applyOperator("between", 10, 1, 10)).toBe(true);
    expect(applyOperator("between", 11, 1, 10)).toBe(false);
    expect(applyOperator("notBetween", 11, 1, 10)).toBe(true);
  });
  it("in / notIn", () => {
    expect(applyOperator("in", "paid", ["paid", "shipped"])).toBe(true);
    expect(applyOperator("in", "x", ["paid", "shipped"])).toBe(false);
    expect(applyOperator("notIn", "x", ["paid", "shipped"])).toBe(true);
  });
  it("contains / notContains (case-insensitive)", () => {
    expect(applyOperator("contains", "Tehran Tower", "tower")).toBe(true);
    expect(applyOperator("notContains", "Tehran Tower", "villa")).toBe(true);
  });
  it("startsWith / endsWith", () => {
    expect(applyOperator("startsWith", "P-1001", "P-")).toBe(true);
    expect(applyOperator("endsWith", "report.pdf", ".pdf")).toBe(true);
  });
  it("isNull / isNotNull", () => {
    expect(applyOperator("isNull", null)).toBe(true);
    expect(applyOperator("isNull", 0)).toBe(false);
    expect(applyOperator("isNotNull", 0)).toBe(true);
  });
  it("isTrue / isFalse", () => {
    expect(applyOperator("isTrue", true)).toBe(true);
    expect(applyOperator("isFalse", false)).toBe(true);
    expect(applyOperator("isTrue", false)).toBe(false);
  });
});

describe("aggregate", () => {
  it("sum / avg / min / max ignore null & non-numeric", () => {
    expect(aggregate("sum", [1, 2, 3, null])).toBe(6);
    expect(aggregate("avg", [2, 4, null])).toBe(3);
    expect(aggregate("min", [5, 2, 9])).toBe(2);
    expect(aggregate("max", [5, 2, 9])).toBe(9);
  });
  it("count counts all rows incl. null; countDistinct counts distinct non-null", () => {
    expect(aggregate("count", [1, null, "x", 2])).toBe(4);
    expect(aggregate("countDistinct", ["a", "a", "b", null])).toBe(2);
  });
  it("empty input → 0", () => {
    expect(aggregate("sum", [])).toBe(0);
    expect(aggregate("avg", [])).toBe(0);
  });
});

describe("dateBucketKey", () => {
  it("month / quarter / year / week / day", () => {
    expect(dateBucketKey("2025-03-11", "month")).toBe("2025-03");
    expect(dateBucketKey("2025-03-11", "quarter")).toBe("2025-Q1");
    expect(dateBucketKey("2025-11-02", "quarter")).toBe("2025-Q4");
    expect(dateBucketKey("2025-03-11", "year")).toBe("2025");
    expect(dateBucketKey("2025-03-11", "day")).toBe("2025-03-11");
    expect(dateBucketKey("2025-03-11", undefined)).toBe("2025-03-11");
  });
});

describe("resolveDynamicValue", () => {
  beforeEach(() => { ENGINE_TODAY.value = Date.UTC(2025, 5, 1); }); // 2025-06-01
  afterEach(() => { ENGINE_TODAY.value = Date.now(); });
  it("today with offsetDays returns an ISO date", () => {
    expect(resolveDynamicValue({ token: "today", offsetDays: -30 })).toBe("2025-05-02");
    expect(resolveDynamicValue({ token: "today" })).toBe("2025-06-01");
  });
  it("startOfYear / startOfMonth", () => {
    expect(resolveDynamicValue({ token: "startOfYear" })).toBe("2025-01-01");
    expect(resolveDynamicValue({ token: "startOfMonth" })).toBe("2025-06-01");
  });
});

describe("evalExpression (safe, post-aggregate)", () => {
  it("arithmetic over alias scope", () => {
    expect(evalExpression("totalSales / orderCount", { totalSales: 100, orderCount: 4 })).toBe(25);
    expect(evalExpression("(revenue - cost) / revenue * 100", { revenue: 200, cost: 50 })).toBe(75);
  });
  it("division by zero → null", () => {
    expect(evalExpression("a / b", { a: 10, b: 0 })).toBeNull();
  });
  it("rejects non-whitelisted tokens", () => {
    expect(() => evalExpression("process.exit(1)", {})).toThrow();
  });
});

// ============================================================
// runQuery — §5.7 delayed projects > 30 days by province
// ============================================================
describe("runQuery — §5.7 delayed projects > 30 days by province", () => {
  beforeEach(() => { ENGINE_TODAY.value = Date.UTC(2025, 5, 1); });
  afterEach(() => { ENGINE_TODAY.value = Date.now(); });

  const def: ReportDefinition = {
    id: "rpt_delayed_projects_by_province", schemaVersion: "1.0",
    name: "پروژه‌های معوق", dataset: "projects",
    columns: [
      { field: "province", label: "استان", type: "string" },
      { field: "id", label: "تعداد پروژه", type: "number", visible: false },
    ],
    filters: [
      { field: "status", operator: "neq", value: "completed" },
      { field: "dueDate", operator: "lt", value: { token: "today", offsetDays: -30 }, dynamic: true },
    ],
    groupBy: [{ field: "province" }],
    metrics: [
      { field: "*", aggregation: "count", alias: "delayedCount", label: "تعداد معوق" },
      { field: "delayDays", aggregation: "avg", alias: "avgDelay", label: "میانگین تأخیر" },
    ],
    sorting: [{ field: "delayedCount", direction: "desc" }],
    presentation: { views: [] },
  };

  it("returns one row per province with the right counts & avg delay, sorted desc", () => {
    const r = runQuery(def, projectData, projectModel);
    expect(r.total).toBe(4);
    const byProvince = Object.fromEntries(r.rows.map((row) => [row.province, row]));
    expect(byProvince["تهران"].delayedCount).toBe(3);
    expect(byProvince["اصفهان"].delayedCount).toBe(2);
    expect(byProvince["خوزستان"].delayedCount).toBe(2);
    expect(byProvince["فارس"].delayedCount).toBe(1);
    expect(byProvince["تهران"].avgDelay).toBe(65);      // (45+60+90)/3
    expect(byProvince["اصفهان"].avgDelay).toBe(85);     // (50+120)/2
    expect(byProvince["خوزستان"].avgDelay).toBe(52.5);  // (35+70)/2
    // sorted by delayedCount desc → تهران first, فارس last
    expect(r.rows[0].province).toBe("تهران");
    expect(r.rows.at(-1)!.province).toBe("فارس");
  });

  it("tags metric columns as isMetric in resolved columns", () => {
    const r = runQuery(def, projectData, projectModel);
    const cols = Object.fromEntries(r.columns.map((c) => [c.key, c]));
    expect(cols["province"].isMetric).toBe(false);
    expect(cols["delayedCount"].isMetric).toBe(true);
    expect(cols["avgDelay"].isMetric).toBe(true);
  });
});

// ============================================================
// runQuery — §5.8 monthly revenue by province (date bucket + series)
// ============================================================
describe("runQuery — §5.8 monthly revenue by province (date bucket + series)", () => {
  beforeEach(() => { ENGINE_TODAY.value = Date.UTC(2025, 5, 1); });
  afterEach(() => { ENGINE_TODAY.value = Date.now(); });

  const def: ReportDefinition = {
    id: "rpt_monthly_revenue_by_province", schemaVersion: "1.0",
    name: "درآمد ماهانه", dataset: "sales",
    columns: [
      { field: "orderDate", label: "ماه", type: "date" },
      { field: "province", label: "استان", type: "string" },
      { field: "amount", label: "درآمد", type: "number" },
    ],
    filters: [{ field: "orderDate", operator: "gte", value: { token: "startOfYear" }, dynamic: true }],
    groupBy: [{ field: "orderDate", dateBucket: "month" }, { field: "province" }],
    metrics: [{ field: "amount", aggregation: "sum", alias: "revenue", label: "درآمد" }],
    sorting: [
      { field: "orderDate", direction: "asc", priority: 1 },
      { field: "province", direction: "asc", priority: 2 },
    ],
    presentation: { views: [] },
  };

  it("buckets orderDate to month and sums amount per (month, province)", () => {
    const r = runQuery(def, salesData, salesModel);
    const cell = (m: string, p: string) =>
      r.rows.find((row) => row.orderDate === m && row.province === p)?.revenue;
    // Jan تهران: S-001 (360M) + S-013 (125M) = 485,000,000
    expect(cell("2025-01", "تهران")).toBe(485_000_000);
    // Feb تهران: S-002 (880M) + S-014 (234M) = 1,114,000,000
    expect(cell("2025-02", "تهران")).toBe(1_114_000_000);
    // Jan خوزستان: S-007 (1.2B)
    expect(cell("2025-01", "خوزستان")).toBe(1_200_000_000);
    // every row's orderDate must be a YYYY-MM bucket (no raw days)
    expect(r.rows.every((row) => /^\d{4}-\d{2}$/.test(String(row.orderDate)))).toBe(true);
    // sorted: first bucket is the earliest month
    expect(r.rows[0].orderDate).toBe("2025-01");
  });
});

// ============================================================
// runQuery — §5.9 top 10 customers by sales (limit + post-aggregate calc)
// ============================================================
describe("runQuery — §5.9 top 10 customers by sales (limit + post-aggregate calc)", () => {
  const def: ReportDefinition = {
    id: "rpt_top10_customers_by_sales", schemaVersion: "1.0",
    name: "۱۰ مشتری برتر", dataset: "sales",
    columns: [
      { field: "customerName", label: "مشتری", type: "string" },
      { field: "amount", label: "فروش", type: "number" },
    ],
    filters: [{ field: "status", operator: "in", value: ["paid", "shipped", "delivered"] }],
    groupBy: [{ field: "customerName" }],
    metrics: [
      { field: "amount", aggregation: "sum", alias: "totalSales", label: "مجموع فروش" },
      { field: "*", aggregation: "count", alias: "orderCount", label: "تعداد سفارش" },
    ],
    calculatedFields: [
      { alias: "avgOrderValue", label: "میانگین ارزش سفارش",
        expression: "totalSales / orderCount", scope: "aggregate", type: "number" },
    ],
    sorting: [{ field: "totalSales", direction: "desc" }],
    limit: 10,
    presentation: { views: [] },
  };

  it("filters by status, sums per customer, derives avgOrderValue, sorts desc, caps to 10", () => {
    const r = runQuery(def, salesData, salesModel);
    // 5 customers in the seed → ≤10, all survive
    expect(r.total).toBe(5);
    const top = r.rows[0];
    // post-aggregate calc holds: avgOrderValue === totalSales / orderCount
    expect(top.avgOrderValue).toBe(Number(top.totalSales) / Number(top.orderCount));
    // sorted desc: row[0].totalSales is the max
    const totals = r.rows.map((row) => Number(row.totalSales));
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    // cancelled/pending rows excluded from every total (S-006 cancelled 500M not in بتا's total)
    const beta = r.rows.find((row) => row.customerName === "شرکت بتا")!;
    // بتا paid/shipped/delivered: S-004(270M)+S-005(150M)+S-017(1000M)+S-022(234M)+S-027(227.5M) = 1,881,500,000
    expect(beta.totalSales).toBe(1_881_500_000);
    expect(beta.orderCount).toBe(5);
  });

  it("limit caps rows after sorting", () => {
    const r = runQuery({ ...def, limit: 2 }, salesData, salesModel);
    expect(r.rows).toHaveLength(2);
    expect(r.total).toBe(2);
  });
});
