// report-web/src/features/export/index.ts
// Barrel: export utilities + the menu builder consumed by AskAiBuilder / future viewer.
export { exportCsv } from "./csv";
export { exportJson } from "./json";

import type { MenuProps } from "antd";
import type { ReportDefinition, QueryResult } from "@/contracts";
import { exportCsv } from "./csv";
import { exportJson } from "./json";

const safeFilename = (def: ReportDefinition) =>
  (def.name ?? def.id ?? "report").replace(/[^a-zA-Z0-9؀-ۿ_-]/g, "_");

/**
 * Returns the Antd Dropdown menu items for the export button.
 * - CSV and JSON: enabled, call real exporters.
 * - PDF and Excel: disabled, labelled with a "v2" note (planned for Task 17).
 *
 * Reused by the Report Viewer and Dashboard (Task 17).
 */
export function buildExportMenuItems(
  def: ReportDefinition,
  result: QueryResult,
): MenuProps["items"] {
  const filename = safeFilename(def);
  return [
    {
      key: "csv",
      label: "CSV",
      onClick: () => exportCsv(result, filename),
    },
    {
      key: "json",
      label: "JSON",
      onClick: () => exportJson(def, result, filename),
    },
    { type: "divider" as const },
    {
      key: "pdf",
      label: "PDF (v2)",
      disabled: true,
    },
    {
      key: "excel",
      label: "Excel (v2)",
      disabled: true,
    },
  ];
}
