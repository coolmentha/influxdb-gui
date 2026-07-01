import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppError, Connection, PingResult } from "@/lib/types";

interface ConnectionState {
  connections: Connection[];
  loading: boolean;
  error: AppError | null;

  load: () => Promise<void>;
  save: (conn: Connection, secret?: string | null) => Promise<Connection>;
  remove: (id: string) => Promise<void>;
  test: (conn: Connection, secret?: string | null) => Promise<PingResult>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await invoke<Connection[]>("list_connections");
      set({ connections, loading: false });
    } catch (e) {
      set({ loading: false, error: e as AppError });
    }
  },

  save: async (conn, secret) => {
    const saved = await invoke<Connection>("save_connection", {
      input: { connection: conn, secret: secret ?? null },
    });
    // Update local list
    const existing = get().connections;
    const idx = existing.findIndex((c) => c.id === saved.id);
    if (idx >= 0) {
      const next = [...existing];
      next[idx] = saved;
      set({ connections: next });
    } else {
      set({ connections: [...existing, saved] });
    }
    return saved;
  },

  remove: async (id) => {
    await invoke("delete_connection", { id });
    set({ connections: get().connections.filter((c) => c.id !== id) });
  },

  test: async (conn, secret) => {
    return await invoke<PingResult>("test_connection_cmd", {
      connection: conn,
      secret: secret ?? null,
    });
  },
}));
