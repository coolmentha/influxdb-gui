import { describe, it, expect } from "vitest";
import { splitStatements, resolveExecutionScope } from "./execution-scope";

describe("splitStatements", () => {
  it("splits by semicolons", () => {
    expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  it("handles trailing semicolon", () => {
    expect(splitStatements("SELECT 1;")).toEqual(["SELECT 1"]);
  });

  it("drops empty statements", () => {
    expect(splitStatements(";; SELECT 1 ;;")).toEqual(["SELECT 1"]);
  });

  it("does not split inside single quotes", () => {
    expect(splitStatements("SELECT 'a;b' FROM t")).toEqual(["SELECT 'a;b' FROM t"]);
  });

  it("does not split inside double quotes", () => {
    expect(splitStatements('SELECT * FROM "my;table"')).toEqual([
      'SELECT * FROM "my;table"',
    ]);
  });

  it("handles single statement without semicolon", () => {
    expect(splitStatements("SELECT 1")).toEqual(["SELECT 1"]);
  });
});

describe("resolveExecutionScope", () => {
  const source = "SELECT 1;\nSELECT 2;\nSELECT 3";

  it("returns selection when text is selected", () => {
    // Select "SELECT 2"
    const start = source.indexOf("SELECT 2");
    const end = start + "SELECT 2".length;
    const result = resolveExecutionScope(source, start, end, start);
    expect(result.scope).toBe("selection");
    expect(result.statements).toEqual(["SELECT 2"]);
  });

  it("returns cursor statement when no selection and cursor is inside one", () => {
    // Cursor inside "SELECT 2"
    const cursorPos = source.indexOf("SELECT 2") + 3;
    const result = resolveExecutionScope(source, 0, 0, cursorPos);
    expect(result.scope).toBe("cursor");
    expect(result.statements).toEqual(["SELECT 2"]);
  });

  it("returns cursor statement when cursor is at start of first statement", () => {
    const result = resolveExecutionScope(source, 0, 0, 0);
    expect(result.scope).toBe("cursor");
    expect(result.statements).toEqual(["SELECT 1"]);
  });

  it("falls back to all when cursor not found in any statement", () => {
    const result = resolveExecutionScope("SELECT 1", 0, 0, 999);
    expect(result.scope).toBe("all");
  });

  it("selection of whitespace falls back to cursor or all", () => {
    // Select just a newline between statements
    const nlPos = source.indexOf("\n");
    const result = resolveExecutionScope(source, nlPos, nlPos + 1, nlPos);
    // Selection has no statements, so should fall to cursor or all
    expect(["cursor", "all"]).toContain(result.scope);
  });
});
