import { create } from "zustand";
import type { Connection } from "@/lib/types";

interface SecretState {
  /** Per connection id, the cached secret (or null if no secret needed). */
  secrets: Record<string, string | null>;
  /** Tracks whether we've already fetched for a connection. */
  loaded: Record<string, boolean>;

  /** Get a cached secret, or null. Does NOT fetch. */
  getSecret: (conn: Connection) => string | null;
  /** Fetch and cache a secret for a connection from keyring. */
  fetchSecret: (conn: Connection) => Promise<string | null>;
  /** Store a secret in keyring + cache. */
  storeSecret: (conn: Connection, secret: string) => Promise<void>;
  clear: (connId: string) => void;
}

export const useSecretStore = create<SecretState>((set, get) => ({
  secrets: {},
  loaded: {},

  getSecret: (conn) => {
    return get().secrets[conn.id] ?? null;
  },

  fetchSecret: async (conn) => {
    if (get().loaded[conn.id]) {
      return get().secrets[conn.id] ?? null;
    }
    // The keyring fetch is done via a Tauri command; for v1 we use a simple
    // get_secret command. If it doesn't exist or fails, treat as no secret.
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const secret = await invoke<string | null>("get_secret", { id: conn.id });
      set((s) => ({
        secrets: { ...s.secrets, [conn.id]: secret },
        loaded: { ...s.loaded, [conn.id]: true },
      }));
      return secret;
    } catch {
      set((s) => ({ loaded: { ...s.loaded, [conn.id]: true } }));
      return null;
    }
  },

  storeSecret: async (conn, secret) => {
    set((s) => ({
      secrets: { ...s.secrets, [conn.id]: secret },
      loaded: { ...s.loaded, [conn.id]: true },
    }));
  },

  clear: (connId) => {
    set((s) => {
      const { [connId]: _, ...rest } = s.secrets;
      const { [connId]: __, ...restLoaded } = s.loaded;
      return { secrets: rest, loaded: restLoaded };
    });
  },
}));
