/** Classify an InfluxQL statement by its leading verb. */

export type StatementKind = "Select" | "Show" | "Explain" | "Write" | "Unknown";

export interface ClassifiedStatement {
  kind: StatementKind;
  verb: string;
}

const WRITE_VERBS = new Set([
  "insert", "delete", "drop", "create", "alter", "grant", "revoke", "kill", "truncate",
]);

/** Classify a statement. Trims and lowercases the leading word for matching. */
export function classifyStatement(sql: string): ClassifiedStatement {
  const trimmed = sql.trim();
  if (trimmed.length === 0) return { kind: "Unknown", verb: "" };

  // Find the first word (up to whitespace or end).
  const match = trimmed.match(/^(\w+)/);
  const verb = match ? match[1].toLowerCase() : "";
  if (!verb) return { kind: "Unknown", verb: "" };

  if (verb === "select") return { kind: "Select", verb };
  if (verb === "show") return { kind: "Show", verb };
  if (verb === "explain") return { kind: "Explain", verb };
  if (WRITE_VERBS.has(verb)) return { kind: "Write", verb };
  return { kind: "Unknown", verb };
}

/** True if the statement is a write operation (refused in v1). */
export function isWriteStatement(sql: string): boolean {
  return classifyStatement(sql).kind === "Write";
}
