import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppError, Connection, FieldKey } from "@/lib/types";

interface MetadataState {
  /** Per-connection, per-database list of databases. */
  databases: Record<string, string[]>;
  /** Per-connection measurements: key `${database}` -> names. */
  measurements: Record<string, string[]>;
  /** Per-connection tag keys: key `${database}:${measurement}` -> keys. */
  tagKeys: Record<string, string[]>;
  /** Per-connection field keys: key `${database}:${measurement}` -> keys. */
  fieldKeys: Record<string, FieldKey[]>;
  loading: boolean;
  error: AppError | null;

  fetchDatabases: (conn: Connection, secret?: string | null) => Promise<string[]>;
  fetchMeasurements: (conn: Connection, database: string, secret?: string | null) => Promise<string[]>;
  fetchTagKeys: (conn: Connection, database: string, measurement: string, secret?: string | null) => Promise<string[]>;
  fetchFieldKeys: (conn: Connection, database: string, measurement: string, secret?: string | null) => Promise<FieldKey[]>;
  clearConnection: (connId: string) => void;
}

function dbKey(connId: string, db?: string) {
  return db ? `${connId}:${db}` : connId;
}

export const useMetadataStore = create<MetadataState>((set, get) => ({
  databases: {},
  measurements: {},
  tagKeys: {},
  fieldKeys: {},
  loading: false,
  error: null,

  fetchDatabases: async (conn, secret) => {
    const key = dbKey(conn.id);
    const cached = get().databases[key];
    if (cached) return cached;
    set({ loading: true, error: null });
    try {
      const dbs = await invoke<string[]>("list_databases_cmd", {
        connection: conn,
        secret: secret ?? null,
      });
      set((s) => ({ databases: { ...s.databases, [key]: dbs }, loading: false }));
      return dbs;
    } catch (e) {
      set({ loading: false, error: e as AppError });
      throw e;
    }
  },

  fetchMeasurements: async (conn, database, secret) => {
    const key = dbKey(conn.id, database);
    const cached = get().measurements[key];
    if (cached) return cached;
    const ms = await invoke<string[]>("list_measurements_cmd", {
      connection: conn,
      secret: secret ?? null,
      database,
    });
    set((s) => ({ measurements: { ...s.measurements, [key]: ms } }));
    return ms;
  },

  fetchTagKeys: async (conn, database, measurement, secret) => {
    const key = `${dbKey(conn.id, database)}:${measurement}`;
    const cached = get().tagKeys[key];
    if (cached) return cached;
    const keys = await invoke<string[]>("list_tag_keys_cmd", {
      connection: conn,
      secret: secret ?? null,
      database,
      measurement,
    });
    set((s) => ({ tagKeys: { ...s.tagKeys, [key]: keys } }));
    return keys;
  },

  fetchFieldKeys: async (conn, database, measurement, secret) => {
    const key = `${dbKey(conn.id, database)}:${measurement}`;
    const cached = get().fieldKeys[key];
    if (cached) return cached;
    const keys = await invoke<FieldKey[]>("list_field_keys_cmd", {
      connection: conn,
      secret: secret ?? null,
      database,
      measurement,
    });
    set((s) => ({ fieldKeys: { ...s.fieldKeys, [key]: keys } }));
    return keys;
  },

  clearConnection: (connId) => {
    const prefix = `${connId}:`;
    const filter = <T>(obj: Record<string, T>) =>
      Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith(prefix) && k !== connId));
    set((s) => ({
      databases: filter(s.databases),
      measurements: filter(s.measurements),
      tagKeys: filter(s.tagKeys),
      fieldKeys: filter(s.fieldKeys),
    }));
  },
}));
