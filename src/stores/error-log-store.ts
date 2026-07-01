import { create } from "zustand";
import type { AppError } from "@/lib/types";

export interface ErrorLogEntry {
  id: string;
  timestamp: string; // ISO
  connectionName: string;
  database: string | null;
  query: string;
  error: AppError;
  rawResponse?: string;
}

interface ErrorLogState {
  entries: ErrorLogEntry[];
  push: (entry: Omit<ErrorLogEntry, "id" | "timestamp">) => void;
  clear: () => void;
  remove: (id: string) => void;
}

let counter = 0;

export const useErrorLogStore = create<ErrorLogState>((set) => ({
  entries: [],

  push: (entry) => {
    counter += 1;
    const full: ErrorLogEntry = {
      ...entry,
      id: `err-${Date.now()}-${counter}`,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ entries: [full, ...s.entries] }));
  },

  clear: () => set({ entries: [] }),
  remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
}));

/** Format an error log entry as markdown for clipboard. */
export function entryToMarkdown(entry: ErrorLogEntry): string {
  const detail = "detail" in entry.error ? JSON.stringify(entry.error.detail, null, 2) : JSON.stringify(entry.error, null, 2);
  return [
    `## Error Log Entry`,
    ``,
    `- **Time**: ${entry.timestamp}`,
    `- **Connection**: ${entry.connectionName}`,
    `- **Database**: ${entry.database ?? "N/A"}`,
    `- **Error Kind**: ${entry.error.kind}`,
    ``,
    `### Query`,
    "```sql",
    entry.query,
    "```",
    ``,
    `### Error Detail`,
    "```",
    detail,
    "```",
  ].join("\n");
}
