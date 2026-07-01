import { describe, it, expect } from "vitest";
import { classifyStatement, isWriteStatement } from "./statement-classify";

describe("classifyStatement", () => {
  it("classifies SELECT", () => {
    expect(classifyStatement("SELECT * FROM cpu")).toEqual({ kind: "Select", verb: "select" });
  });

  it("classifies SHOW", () => {
    expect(classifyStatement("SHOW DATABASES")).toEqual({ kind: "Show", verb: "show" });
  });

  it("classifies lowercase select", () => {
    expect(classifyStatement("select * from cpu")).toEqual({ kind: "Select", verb: "select" });
  });

  it("classifies INSERT as Write", () => {
    expect(classifyStatement("INSERT INTO cpu,host=server01 value=0.64")).toEqual({ kind: "Write", verb: "insert" });
  });

  it("classifies DROP as Write", () => {
    expect(classifyStatement('DROP MEASUREMENT "cpu"')).toEqual({ kind: "Write", verb: "drop" });
  });

  it("classifies CREATE as Write", () => {
    expect(classifyStatement("CREATE RETENTION POLICY rp1 ON mydb DURATION 30d")).toEqual({ kind: "Write", verb: "create" });
  });

  it("classifies DELETE as Write", () => {
    expect(classifyStatement('DELETE FROM cpu WHERE time < now() - 1d')).toEqual({ kind: "Write", verb: "delete" });
  });

  it("does not false-positive on table name matching insert", () => {
    // SELECT from a measurement named "insert_events" should NOT be a write
    expect(classifyStatement('SELECT * FROM "insert_events"')).toEqual({ kind: "Select", verb: "select" });
  });

  it("classifies GRANT as Write", () => {
    expect(classifyStatement("GRANT ALL ON mydb TO user1")).toEqual({ kind: "Write", verb: "grant" });
  });

  it("classifies KILL as Write", () => {
    expect(classifyStatement("KILL QUERY 42")).toEqual({ kind: "Write", verb: "kill" });
  });

  it("classifies empty as Unknown", () => {
    expect(classifyStatement("   ")).toEqual({ kind: "Unknown", verb: "" });
  });

  it("classifies unknown verb as Unknown", () => {
    expect(classifyStatement("FOOBAR something")).toEqual({ kind: "Unknown", verb: "foobar" });
  });
});

describe("isWriteStatement", () => {
  it("returns true for INSERT", () => {
    expect(isWriteStatement("INSERT INTO cpu value=1")).toBe(true);
  });

  it("returns false for SELECT", () => {
    expect(isWriteStatement("SELECT * FROM cpu")).toBe(false);
  });

  it("returns false for SHOW", () => {
    expect(isWriteStatement("SHOW MEASUREMENTS")).toBe(false);
  });
});
