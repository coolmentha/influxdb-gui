import { describe, it, expect, beforeEach } from "vitest";
import { useErrorLogStore, entryToMarkdown, type ErrorLogEntry } from "./error-log-store";

describe("useErrorLogStore", () => {
  beforeEach(() => {
    useErrorLogStore.setState({ entries: [] });
  });

  it("pushes an entry and prepends it", () => {
    useErrorLogStore.getState().push({
      connectionName: "prod",
      database: "mydb",
      query: "SELECT 1",
      error: { kind: "Network", detail: "refused" },
    });
    expect(useErrorLogStore.getState().entries).toHaveLength(1);
    expect(useErrorLogStore.getState().entries[0].connectionName).toBe("prod");
  });

  it("generates unique ids", () => {
    useErrorLogStore.getState().push({
      connectionName: "a", database: null, query: "q1",
      error: { kind: "Network", detail: "x" },
    });
    useErrorLogStore.getState().push({
      connectionName: "b", database: null, query: "q2",
      error: { kind: "Auth", detail: "y" },
    });
    const ids = useErrorLogStore.getState().entries.map((e) => e.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("clears all entries", () => {
    useErrorLogStore.getState().push({
      connectionName: "a", database: null, query: "q",
      error: { kind: "Network", detail: "x" },
    });
    useErrorLogStore.getState().clear();
    expect(useErrorLogStore.getState().entries).toHaveLength(0);
  });

  it("removes by id", () => {
    useErrorLogStore.getState().push({
      connectionName: "a", database: null, query: "q",
      error: { kind: "Network", detail: "x" },
    });
    const id = useErrorLogStore.getState().entries[0].id;
    useErrorLogStore.getState().remove(id);
    expect(useErrorLogStore.getState().entries).toHaveLength(0);
  });
});

describe("entryToMarkdown", () => {
  it("produces markdown with query and error", () => {
    const entry: ErrorLogEntry = {
      id: "e1",
      timestamp: "2026-01-01T00:00:00Z",
      connectionName: "prod",
      database: "mydb",
      query: "SELECT * FROM cpu",
      error: { kind: "InfluxError", detail: { code: 400, message: "bad query" } },
    };
    const md = entryToMarkdown(entry);
    expect(md).toContain("SELECT * FROM cpu");
    expect(md).toContain("InfluxError");
    expect(md).toContain("prod");
    expect(md).toContain("```sql");
  });
});
