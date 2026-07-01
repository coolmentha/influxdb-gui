import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConnectionStore } from "./connection-store";
import type { Connection } from "@/lib/types";

// Mock @tauri-apps/api/core invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

function makeConn(overrides: Partial<Connection> = {}): Connection {
  return {
    id: "c1",
    name: "prod",
    url: "http://localhost:8086",
    default_database: "mydb",
    skip_tls_verify: false,
    auth: { type: "none" },
    ...overrides,
  };
}

describe("useConnectionStore", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    useConnectionStore.setState({ connections: [], loading: false, error: null });
  });

  it("loads connections from backend", async () => {
    const conns = [makeConn()];
    vi.mocked(invoke).mockResolvedValueOnce(conns);

    await useConnectionStore.getState().load();

    expect(invoke).toHaveBeenCalledWith("list_connections");
    expect(useConnectionStore.getState().connections).toEqual(conns);
  });

  it("saves a new connection with secret", async () => {
    const newConn = makeConn({ id: "", name: "dev" });
    const saved = makeConn({ id: "uuid-1", name: "dev" });
    vi.mocked(invoke).mockResolvedValueOnce(saved);

    const result = await useConnectionStore.getState().save(newConn, "secret123");

    expect(invoke).toHaveBeenCalledWith("save_connection", {
      input: { connection: newConn, secret: "secret123" },
    });
    expect(result).toEqual(saved);
  });

  it("deletes a connection by id", async () => {
    useConnectionStore.setState({ connections: [makeConn()] });
    vi.mocked(invoke).mockResolvedValueOnce(undefined);

    await useConnectionStore.getState().remove("c1");

    expect(invoke).toHaveBeenCalledWith("delete_connection", { id: "c1" });
    expect(useConnectionStore.getState().connections).toHaveLength(0);
  });

  it("stores error when load fails", async () => {
    vi.mocked(invoke).mockRejectedValueOnce({ kind: "Network", detail: "refused" });

    await useConnectionStore.getState().load();

    expect(useConnectionStore.getState().error).not.toBeNull();
    expect(useConnectionStore.getState().error?.kind).toBe("Network");
  });
});
