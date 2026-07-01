import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppError, Connection, QueryResult } from "@/lib/types";
import { useErrorLogStore } from "./error-log-store";

export interface QueryTab {
  id: string;
  title: string;
  connectionId: string;
  connection: Connection;
  database: string | null;
  source: string;
}

export interface QueryExecution {
  tabId: string;
  status: "idle" | "running" | "success" | "error";
  queryId?: string;
  results?: QueryResult[];
  autoLimitApplied?: boolean;
  truncated?: boolean;
  autoLimitValue?: number | null;
  elapsedMs?: number;
  error?: AppError | null;
}

interface QueryState {
  tabs: QueryTab[];
  activeTabId: string | null;
  executions: Record<string, QueryExecution>;

  openTab: (conn: Connection, database?: string | null) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateSource: (id: string, source: string) => void;
  runQuery: (tabId: string, statements: string[]) => Promise<void>;
  cancelQuery: (tabId: string) => Promise<void>;
}

let tabCounter = 0;

export const useQueryStore = create<QueryState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  executions: {},

  openTab: (conn, database = null) => {
    tabCounter += 1;
    const id = `tab-${Date.now()}-${tabCounter}`;
    const tab: QueryTab = {
      id,
      title: `Query ${tabCounter}`,
      connectionId: conn.id,
      connection: conn,
      database,
      source: "",
    };
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: id,
    }));
    return id;
  },

  closeTab: (id) => {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId = s.activeTabId === id ? tabs[0]?.id ?? null : s.activeTabId;
      const { [id]: _, ...executions } = s.executions;
      return { tabs, activeTabId, executions };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateSource: (id, source) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, source } : t)),
    }));
  },

  runQuery: async (tabId, statements) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const queryId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    set((s) => ({
      executions: {
        ...s.executions,
        [tabId]: { tabId, status: "running", queryId },
      },
    }));

    const start = Date.now();
    try {
      // Execute all statements; for v1 we join them and run as one query.
      // InfluxDB /query supports multiple semicolon-separated statements.
      const query = statements.join(";\n");
      const response = await invoke<{
        results: QueryResult[];
        auto_limit_applied: boolean;
        truncated: boolean;
        auto_limit_value: number | null;
      }>("run_query_cmd", {
        input: {
          connection: tab.connection,
          secret: null,
          database: tab.database,
          query,
          query_id: queryId,
          auto_limit: true,
        },
      });

      set((s) => ({
        executions: {
          ...s.executions,
          [tabId]: {
            tabId,
            status: "success",
            results: response.results,
            autoLimitApplied: response.auto_limit_applied,
            truncated: response.truncated,
            autoLimitValue: response.auto_limit_value,
            elapsedMs: Date.now() - start,
          },
        },
      }));
    } catch (e) {
      const err = e as AppError;
      // Don't log cancellations as errors
      if (err.kind !== "Cancelled") {
        useErrorLogStore.getState().push({
          connectionName: tab.connection.name,
          database: tab.database,
          query: statements.join(";\n"),
          error: err,
        });
      }
      set((s) => ({
        executions: {
          ...s.executions,
          [tabId]: {
            tabId,
            status: "error",
            error: err,
            elapsedMs: Date.now() - start,
          },
        },
      }));
    }
  },

  cancelQuery: async (tabId) => {
    const exec = get().executions[tabId];
    if (exec?.status !== "running" || !exec.queryId) return;
    try {
      await invoke("cancel_query_cmd", { queryId: exec.queryId });
    } catch {
      // Best-effort cancel
    }
  },
}));
