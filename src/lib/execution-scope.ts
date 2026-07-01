/**
 * Split InfluxQL source into individual statements by unquoted semicolons.
 * A statement is trimmed; empty statements (just whitespace/semicolons) are dropped.
 */
export function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const prev = source[i - 1];

    if (ch === "'" && !inDoubleQuote && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
    } else if (ch === '"' && !inSingleQuote && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
    } else if (ch === ";" && !inSingleQuote && !inDoubleQuote) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
      continue;
    }
    current += ch;
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements;
}

export type ScopeKind = "selection" | "cursor" | "all";

export interface ExecutionScope {
  scope: ScopeKind;
  statements: string[];
}

/**
 * Resolve which statements to execute based on editor state.
 * Priority: selection (if non-empty) → statement under cursor → all.
 */
export function resolveExecutionScope(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  cursorPos: number,
): ExecutionScope {
  // Selection takes priority if it's non-empty.
  if (selectionStart !== selectionEnd) {
    const selected = source.slice(selectionStart, selectionEnd);
    const statements = splitStatements(selected);
    if (statements.length > 0) {
      return { scope: "selection", statements };
    }
  }

  const all = splitStatements(source);

  // Find the statement the cursor falls within.
  let pos = 0;
  for (const stmt of all) {
    const start = source.indexOf(stmt, pos);
    const end = start + stmt.length;
    if (cursorPos >= start && cursorPos <= end) {
      return { scope: "cursor", statements: [stmt] };
    }
    pos = end;
  }

  // Fallback: run everything.
  return { scope: "all", statements: all };
}
