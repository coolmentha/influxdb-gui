import { describe, it, expect } from "vitest";
import { seriesToCsv, seriesToJson } from "./export";
import type { SeriesRow } from "./types";

const sample: SeriesRow = {
  name: "cpu",
  columns: ["time", "host", "usage_idle"],
  values: [
    ["2021-01-01T00:00:00Z", "server01", 98.5],
    ["2021-01-01T00:01:00Z", "server01", 99.1],
  ],
};

describe("seriesToCsv", () => {
  it("produces header + rows", () => {
    const csv = seriesToCsv(sample);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("time,host,usage_idle");
    expect(lines[1]).toBe("2021-01-01T00:00:00Z,server01,98.5");
    expect(lines.length).toBe(3);
  });

  it("escapes fields with commas", () => {
    const s: SeriesRow = {
      name: "t",
      columns: ["a", "b"],
      values: [["has,comma", "x"]],
    };
    expect(seriesToCsv(s)).toBe('a,b\n"has,comma",x');
  });

  it("escapes fields with quotes", () => {
    const s: SeriesRow = {
      name: "t",
      columns: ["a"],
      values: [['has"quote']],
    };
    expect(seriesToCsv(s)).toBe('a\n"has""quote"');
  });

  it("handles null values as empty", () => {
    const s: SeriesRow = {
      name: "t",
      columns: ["a", "b"],
      values: [[null, "x"]],
    };
    expect(seriesToCsv(s)).toBe("a,b\n,x");
  });
});

describe("seriesToJson", () => {
  it("produces array of objects keyed by column", () => {
    const json = seriesToJson(sample);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].time).toBe("2021-01-01T00:00:00Z");
    expect(parsed[0].host).toBe("server01");
    expect(parsed[0].usage_idle).toBe(98.5);
  });

  it("uses null for missing values", () => {
    const s: SeriesRow = {
      name: "t",
      columns: ["a", "b"],
      values: [[null, "x"]],
    };
    const parsed = JSON.parse(seriesToJson(s));
    expect(parsed[0].a).toBeNull();
    expect(parsed[0].b).toBe("x");
  });
});
