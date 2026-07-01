/** Mirrors the Rust `AuthConfig` enum (serde tagged union). */
export type AuthConfig =
  | { type: "none" }
  | { type: "basic"; username: string }
  | { type: "token" };

/** Mirrors the Rust `Connection` struct. Secrets never live here. */
export interface Connection {
  id: string;
  name: string;
  url: string;
  default_database?: string | null;
  skip_tls_verify: boolean;
  auth: AuthConfig;
}

/** Mirrors the Rust `PingResult`. */
export interface PingResult {
  version: string;
  reachable: boolean;
}

/** Mirrors the Rust `ServerCapabilities` struct. */
export interface ServerCapabilities {
  version: string;
  major: number;
  minor: number;
  patch: number;
  supports_token_auth: boolean;
  supports_server_cancel: boolean;
}

/** Mirrors the Rust `QueryResult` — one statement's result. */
export interface QueryResult {
  statement_id: number;
  series: SeriesRow[];
  error?: string | null;
}

/** Mirrors the Rust `Series`. */
export interface SeriesRow {
  name: string;
  columns: string[];
  values: unknown[][];
}

/** Mirrors the Rust `SaveConnectionInput`. */
export interface SaveConnectionInput {
  connection: Connection;
  secret?: string | null;
}

/** Mirrors the Rust `AppError` (tagged union via serde). */
export type AppError =
  | { kind: "Network"; detail: string }
  | { kind: "Auth"; detail: string }
  | { kind: "Tls"; detail: string }
  | { kind: "InfluxError"; detail: { code: number; message: string } }
  | { kind: "Timeout"; detail: number }
  | { kind: "Cancelled" }
  | { kind: "LimitExceeded"; detail: { returned: number; truncated: boolean } }
  | { kind: "WriteNotSupported"; detail: { verb: string } }
  | { kind: "NotFound"; detail: string }
  | { kind: "Internal"; detail: string };

/** Human-readable message from an AppError, matching the Rust Display impl. */
export function appErrorMessage(e: AppError): string {
  switch (e.kind) {
    case "Network": return `网络错误: ${e.detail}`;
    case "Auth": return `认证失败: ${e.detail}`;
    case "Tls": return `TLS 错误: ${e.detail}`;
    case "InfluxError": return `InfluxDB 错误 ${e.detail.code}: ${e.detail.message}`;
    case "Timeout": return `请求超时 (${e.detail}s)`;
    case "Cancelled": return `查询已取消`;
    case "LimitExceeded": return `结果限制: 返回 ${e.detail.returned} 行,已截断`;
    case "WriteNotSupported": return `写操作 "${e.detail.verb}" 在 v1 不支持`;
    case "NotFound": return `未找到: ${e.detail}`;
    case "Internal": return `内部错误: ${e.detail}`;
  }
}
