// report-web/src/features/export/json.ts
import type { ReportDefinition, QueryResult } from "@/contracts";

/**
 * Serialise a ReportDefinition + QueryResult to JSON and trigger a browser download.
 * The payload is `{ definition, result }` so the consumer has the full picture.
 */
export function exportJson(
  def: ReportDefinition,
  result: QueryResult,
  filename: string,
): void {
  const payload = { definition: def, result };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, `${filename}.json`);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
