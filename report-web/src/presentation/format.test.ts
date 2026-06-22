import { describe, it, expect } from "vitest";
import {
  toPersianDigits,
  formatNumber,
  formatDate,
  formatCell,
} from "./format";

describe("toPersianDigits", () => {
  it("maps ASCII digits to Persian digits", () => {
    expect(toPersianDigits("1234567890")).toBe("۱۲۳۴۵۶۷۸۹۰");
  });
  it("accepts numbers and leaves non-digit chars untouched", () => {
    expect(toPersianDigits(12.5)).toBe("۱۲.۵");
    expect(toPersianDigits("$12")).toBe("$۱۲");
  });
});

describe("formatNumber", () => {
  it("groups thousands and uses ASCII in LTR", () => {
    expect(formatNumber(1234567, "ltr")).toBe("1,234,567");
  });
  it("groups thousands and uses Persian digits in RTL", () => {
    expect(formatNumber(1234567, "rtl")).toBe("۱٬۲۳۴٬۵۶۷");
  });
  it("renders null/undefined as an empty string", () => {
    expect(formatNumber(null, "rtl")).toBe("");
    expect(formatNumber(undefined, "ltr")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats an ISO date to YYYY/MM/DD in LTR", () => {
    expect(formatDate("2026-06-22T00:00:00Z", "ltr")).toBe("2026/06/22");
  });
  it("uses Persian digits in RTL", () => {
    expect(formatDate("2026-06-22", "rtl")).toBe("۲۰۲۶/۰۶/۲۲");
  });
  it("renders null as an empty string", () => {
    expect(formatDate(null, "ltr")).toBe("");
  });
});

describe("formatCell", () => {
  it("dispatches by field type", () => {
    expect(formatCell(1000, "number", "ltr")).toBe("1,000");
    expect(formatCell("2026-01-01", "date", "ltr")).toBe("2026/01/01");
    expect(formatCell("Tehran", "string", "ltr")).toBe("Tehran");
    expect(formatCell(null, "number", "rtl")).toBe("");
  });
});
