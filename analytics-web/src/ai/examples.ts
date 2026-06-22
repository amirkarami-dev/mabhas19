// report-web/src/ai/examples.ts
import type { SemanticModel } from "../contracts/semantic";
import type { ReportDefinition } from "../contracts/report-definition";
import { normalizePrompt } from "./rules";

export interface AIExample {
  id: string;
  /** every term must appear in the normalized prompt. */
  matchAll: string[][]; // each inner array = OR-synonyms; all groups must hit
  modelId: string;      // SemanticModel.id this example targets
  build(model: SemanticModel): ReportDefinition;
}

/** true if the normalized prompt contains at least one synonym from every group. */
function matchesAll(prompt: string, groups: string[][]): boolean {
  return groups.every((g) => g.some((syn) => prompt.includes(normalizePrompt(syn))));
}

export const EXAMPLES: AIExample[] = [
  // ----- §5.8 Monthly Revenue by Province -----
  {
    id: "revenue-monthly-by-province",
    modelId: "model-sales",
    matchAll: [["درامد", "درآمد", "revenue"], ["ماهانه", "monthly"], ["استان", "province"]],
    build: () => ({
      id: "rpt_monthly_revenue_by_province",
      schemaVersion: "1.0",
      name: "درآمد ماهانه به تفکیک استان",
      description: "Sum of revenue per month, split into one line per province.",
      tags: ["finance", "revenue", "time-series"],
      dataset: "sales",
      columns: [
        { field: "orderDate", label: "ماه", type: "date" },
        { field: "province", label: "استان", type: "string" },
        { field: "amount", label: "درآمد", type: "number",
          format: { kind: "currency", currency: "IRR", decimals: 0 } },
      ],
      filters: [
        { field: "orderDate", operator: "gte", value: { token: "startOfYear" }, dynamic: true },
      ],
      groupBy: [
        { field: "orderDate", dateBucket: "month" },
        { field: "province" },
      ],
      metrics: [
        { field: "amount", aggregation: "sum", alias: "revenue", label: "درآمد",
          format: { kind: "currency", currency: "IRR", decimals: 0 } },
      ],
      sorting: [
        { field: "orderDate", direction: "asc", priority: 1 },
        { field: "province", direction: "asc", priority: 2 },
      ],
      presentation: { views: [] },
    }),
  },
  // ----- §5.9 Top 10 Customers by Sales -----
  {
    id: "top-customers-by-sales",
    modelId: "model-sales",
    matchAll: [["مشتری", "customer"], ["برتر", "بیشترین", "top"], ["فروش", "درامد", "درآمد", "sales", "revenue"]],
    build: () => ({
      id: "rpt_top10_customers_by_sales",
      schemaVersion: "1.0",
      name: "۱۰ مشتری برتر بر اساس فروش",
      description: "Customers ranked by total sales; top 10 only.",
      tags: ["crm", "sales", "ranking"],
      dataset: "sales",
      columns: [
        { field: "customerName", label: "مشتری", type: "string" },
        { field: "amount", label: "فروش", type: "number",
          format: { kind: "currency", currency: "IRR", decimals: 0 } },
      ],
      filters: [
        { field: "status", operator: "in", value: ["paid", "shipped", "delivered"] },
      ],
      groupBy: [{ field: "customerName" }],
      metrics: [
        { field: "amount", aggregation: "sum", alias: "totalSales", label: "مجموع فروش",
          format: { kind: "currency", currency: "IRR", decimals: 0 } },
        { field: "*", aggregation: "count", alias: "orderCount", label: "تعداد سفارش" },
      ],
      calculatedFields: [
        { alias: "avgOrderValue", label: "میانگین ارزش سفارش",
          expression: "totalSales / orderCount", scope: "aggregate", type: "number",
          format: { kind: "currency", currency: "IRR", decimals: 0 } },
      ],
      sorting: [{ field: "totalSales", direction: "desc" }],
      limit: 10,
      presentation: { views: [] },
    }),
  },
  // ----- §5.7 Delayed Projects > 30 Days by Province -----
  {
    id: "delayed-projects-by-province",
    modelId: "model-project",
    matchAll: [["پروژه", "project"], ["تاخیر", "تأخیر", "معوق", "delay", "delayed", "overdue"], ["استان", "province"]],
    build: () => ({
      id: "rpt_delayed_projects_by_province",
      schemaVersion: "1.0",
      name: "پروژه‌های معوق بیش از ۳۰ روز به تفکیک استان",
      description: "Projects whose due date passed more than 30 days ago, counted per province.",
      tags: ["construction", "delays", "operations"],
      dataset: "projects",
      columns: [
        { field: "province", label: "استان", type: "string" },
        { field: "delayedCount", label: "تعداد پروژه", type: "number" },
      ],
      filters: [
        { field: "status", operator: "neq", value: "completed" },
        { field: "dueDate", operator: "lt", value: { token: "today", offsetDays: -30 }, dynamic: true },
      ],
      groupBy: [{ field: "province" }],
      metrics: [
        { field: "*", aggregation: "count", alias: "delayedCount", label: "تعداد معوق" },
      ],
      sorting: [{ field: "delayedCount", direction: "desc" }],
      presentation: { views: [] },
    }),
  },
];

/** Return the first example whose model + term groups all match, else undefined. */
export function matchExample(normalizedPrompt: string, modelId: string): AIExample | undefined {
  return EXAMPLES.find((e) => e.modelId === modelId && matchesAll(normalizedPrompt, e.matchAll));
}

/**
 * Curated prompt chips shown in the AskAiBuilder hero (§3.1).
 * Each entry has a short label (shown on the chip), the canonical prompt, and
 * the datasetKey to pre-select before generating.
 */
export const EXAMPLE_PROMPTS: {
  id: string;
  label: string;
  prompt: string;
  datasetKey: string;
}[] = [
  {
    id: "monthly-revenue-province",
    label: "درآمد ماهانه هر استان",
    prompt: "درآمد ماهانه به تفکیک استان",
    datasetKey: "sales",
  },
  {
    id: "top-customers",
    label: "۱۰ مشتری برتر",
    prompt: "۱۰ مشتری برتر بر اساس فروش",
    datasetKey: "sales",
  },
  {
    id: "delayed-projects",
    label: "پروژه‌های معوق",
    prompt: "پروژه‌های دارای تأخیر بیش از ۳۰ روز به تفکیک استان",
    datasetKey: "projects",
  },
  {
    id: "sales-by-category",
    label: "فروش به تفکیک دسته",
    prompt: "فروش به تفکیک دسته‌بندی محصول",
    datasetKey: "sales",
  },
  {
    id: "province-sales",
    label: "فروش هر استان",
    prompt: "مجموع فروش به تفکیک استان",
    datasetKey: "sales",
  },
  {
    id: "finance-monthly",
    label: "هزینه ماهانه",
    prompt: "هزینه‌های ماهانه",
    datasetKey: "finance",
  },
  {
    id: "project-status",
    label: "وضعیت پروژه‌ها",
    prompt: "تعداد پروژه به تفکیک وضعیت",
    datasetKey: "projects",
  },
];
