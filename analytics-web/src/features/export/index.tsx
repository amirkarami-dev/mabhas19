import type { MenuProps } from "antd";
import type { QueryResult, ReportDefinition } from "@/contracts";
import { toCsv } from "./csv";
import { toJson } from "./json";
import { downloadBlob } from "./download";

export { toCsv } from "./csv";
export { toJson } from "./json";
export { downloadBlob } from "./download";

function baseName(def: ReportDefinition): string {
  return (
    def.presentation?.export?.fileName ??
    def.name?.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") ??
    "report"
  );
}

export function exportCsv(def: ReportDefinition, result: QueryResult): void {
  // Prepend UTF-8 BOM so Excel opens Persian text correctly.
  downloadBlob("\uFEFF" + toCsv(result), `${baseName(def)}.csv`, "text/csv");
}

export function exportJson(def: ReportDefinition, result: QueryResult): void {
  downloadBlob(toJson(def, result), `${baseName(def)}.json`, "application/json");
}

/** antd Dropdown items for the export menu.
 *  v1: CSV + JSON real; PDF + Excel disabled with a "v2" tag. */
export function buildExportMenuItems(
  def: ReportDefinition,
  result: QueryResult,
): NonNullable<MenuProps["items"]> {
  const v2 = { fontSize: 10, opacity: 0.7, marginInlineStart: 8 };
  return [
    { key: "csv", label: "CSV", onClick: () => exportCsv(def, result) },
    { key: "json", label: "JSON", onClick: () => exportJson(def, result) },
    { type: "divider" },
    {
      key: "pdf",
      disabled: true,
      label: (
        <span>
          PDF<span style={v2}>v2</span>
        </span>
      ),
    },
    {
      key: "excel",
      disabled: true,
      label: (
        <span>
          Excel<span style={v2}>v2</span>
        </span>
      ),
    },
  ];
}
