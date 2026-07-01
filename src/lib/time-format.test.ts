import { describe, it, expect } from "vitest";
import { formatTimeValue, nsToDate } from "./time-format";

describe("formatTimeValue", () => {
  const ns = 1_609_459_200_000_000_000; // 2021-01-01 00:00:00 UTC

  it("returns raw nanoseconds when mode is ns", () => {
    expect(formatTimeValue(ns, "ns")).toBe(String(ns));
  });

  it("formats as UTC when mode is utc", () => {
    const result = formatTimeValue(ns, "utc");
    expect(result).toContain("2021-01-01 00:00:00");
  });

  it("formats as local time when mode is local", () => {
    const result = formatTimeValue(ns, "local");
    // Local time depends on TZ, but should be a date string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("handles ISO string input", () => {
    const result = formatTimeValue("2021-01-01T00:00:00Z", "utc");
    expect(result).toContain("2021-01-01 00:00:00");
  });

  it("returns string as-is if unparseable", () => {
    expect(formatTimeValue("not-a-date", "local")).toBe("not-a-date");
  });

  it("handles null/undefined", () => {
    expect(formatTimeValue(null, "local")).toBe("");
    expect(formatTimeValue(undefined, "local")).toBe("");
  });
});

describe("nsToDate", () => {
  it("converts nanoseconds to Date", () => {
    const d = nsToDate(1_609_459_200_000_000_000);
    expect(d.getTime()).toBe(1609459200000);
  });
});
