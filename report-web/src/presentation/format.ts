import type { FieldType } from "../contracts/common";

export type Dir = "rtl" | "ltr";

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Map ASCII 0-9 to Persian digits; all other characters pass through. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Grouped thousands formatting. LTR uses ASCII comma grouping; RTL uses
 * Persian digits with the Persian thousands separator (U+066C).
 */
export function formatNumber(
  value: number | null | undefined,
  dir: Dir,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  if (dir === "ltr") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  // Group with ASCII first, then transliterate separators + digits.
  const grouped = new Intl.NumberFormat("en-US").format(value);
  return toPersianDigits(grouped).replace(/,/g, "٬");
}

/**
 * Date display as YYYY/MM/DD. v1 keeps the Gregorian calendar; the Jalali
 * conversion is a documented later-phase swap (the digit/grouping behaviour
 * here is the tested contract and stays identical when Jalali lands).
 */
export function formatDate(
  value: string | number | null | undefined,
  dir: Dir,
): string {
  if (value === null || value === undefined || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const out = `${y}/${m}/${day}`;
  return dir === "rtl" ? toPersianDigits(out) : out;
}

/** Dispatch a single cell value to the right formatter by semantic type. */
export function formatCell(
  value: string | number | null,
  type: FieldType,
  dir: Dir,
): string {
  if (value === null || value === undefined) return "";
  switch (type) {
    case "number":
      return formatNumber(typeof value === "number" ? value : Number(value), dir);
    case "date":
      return formatDate(value, dir);
    case "boolean":
      return value ? (dir === "rtl" ? "بله" : "Yes") : dir === "rtl" ? "خیر" : "No";
    default:
      return String(value);
  }
}
