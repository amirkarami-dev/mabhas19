// report-web/src/features/export/csv.ts
import type { QueryResult } from "@/contracts";

/**
 * Serialise a QueryResult to CSV and trigger a browser download.
 * Column order matches result.columns. Cells are double-quote escaped.
 */
export function exportCsv(result: QueryResult, filename: string): void {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? "" : String(v);
    // Wrap in double-quotes and escape embedded double-quotes.
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = result.columns.map((c) => escape(c.label ?? c.key)).join(",");
  const body = result.rows
    .map((row) => result.columns.map((c) => escape(row[c.key])).join(","))
    .join("\r\n");
  const csv = `${header}\r\n${body}`;

  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
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
  // Small delay before revoking so the browser can start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
