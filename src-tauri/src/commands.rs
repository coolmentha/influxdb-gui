use crate::capabilities::{self, ServerCapabilities};
use crate::error::AppError;
use crate::influx::{self, PingResult};
use crate::models::{AuthConfig, Connection};
use crate::registry;
use uuid::Uuid;

const KEYRING_SERVICE: &str = "influxdb-gui";

/// Fetch the secret (password or token) for a connection from the OS keyring.
fn fetch_secret_from_keyring(conn: &Connection) -> Option<String> {
    match &conn.auth {
        AuthConfig::None => None,
        _ => keyring::Entry::new(KEYRING_SERVICE, &conn.id)
            .ok()
            .and_then(|e| e.get_password().ok()),
    }
}

/// Store a secret for a connection in the OS keyring.
fn set_secret(conn: &Connection, secret: &str) -> Result<(), AppError> {
    match &conn.auth {
        AuthConfig::None => Ok(()),
        _ => {
            keyring::Entry::new(KEYRING_SERVICE, &conn.id)
                .map_err(|e| AppError::Internal(e.to_string()))?
                .set_password(secret)
                .map_err(|e| AppError::Internal(e.to_string()))
        }
    }
}

/// Delete a connection's secret from the keyring (best-effort).
fn delete_secret(conn: &Connection) {
    if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, &conn.id) {
        let _ = entry.delete_credential();
    }
}

/// Input for creating/saving a connection (secret provided separately).
#[derive(serde::Deserialize)]
pub struct SaveConnectionInput {
    pub connection: Connection,
    #[serde(default)]
    pub secret: Option<String>,
}

#[tauri::command]
pub fn list_connections() -> Result<Vec<Connection>, AppError> {
    Ok(registry::load_connections())
}

#[tauri::command]
pub fn save_connection(input: SaveConnectionInput) -> Result<Connection, AppError> {
    let mut conn = input.connection;
    if conn.id.is_empty() {
        conn.id = Uuid::new_v4().to_string();
    }
    if let Some(secret) = input.secret {
        set_secret(&conn, &secret)?;
    }
    let mut conns = registry::load_connections();
    registry::upsert_connection(&mut conns, conn.clone());
    registry::save_connections(&conns).map_err(AppError::Internal)?;
    Ok(conn)
}

#[tauri::command]
pub fn delete_connection(id: String) -> Result<(), AppError> {
    let mut conns = registry::load_connections();
    if registry::remove_connection(&mut conns, &id) {
        registry::save_connections(&conns).map_err(AppError::Internal)?;
        // Best-effort keyring cleanup
        if let Ok(entry) = keyring::Entry::new(KEYRING_SERVICE, &id) {
            let _ = entry.delete_credential();
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn test_connection_cmd(connection: Connection, secret: Option<String>) -> Result<PingResult, AppError> {
    influx::test_connection(&connection, secret.as_deref()).await
}

#[tauri::command]
pub async fn probe_capabilities_cmd(connection: Connection, secret: Option<String>) -> Result<ServerCapabilities, AppError> {
    capabilities::probe_capabilities(&connection, secret.as_deref()).await
}

/// Fetch a connection's secret from the OS keyring. Returns None if no secret
/// or not found.
#[tauri::command]
pub fn get_secret(id: String) -> Result<Option<String>, AppError> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, &id)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    match entry.get_password() {
        Ok(s) => Ok(Some(s)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Internal(e.to_string())),
    }
}

#[tauri::command]
pub async fn list_databases_cmd(connection: Connection, secret: Option<String>) -> Result<Vec<String>, AppError> {
    influx::list_databases(&connection, secret.as_deref()).await
}

#[tauri::command]
pub async fn list_measurements_cmd(
    connection: Connection,
    secret: Option<String>,
    database: String,
) -> Result<Vec<String>, AppError> {
    influx::list_measurements(&connection, secret.as_deref(), &database).await
}

#[tauri::command]
pub async fn list_tag_keys_cmd(
    connection: Connection,
    secret: Option<String>,
    database: String,
    measurement: String,
) -> Result<Vec<String>, AppError> {
    influx::list_tag_keys(&connection, secret.as_deref(), &database, &measurement).await
}

#[tauri::command]
pub async fn list_field_keys_cmd(
    connection: Connection,
    secret: Option<String>,
    database: String,
    measurement: String,
) -> Result<Vec<String>, AppError> {
    influx::list_field_keys(&connection, secret.as_deref(), &database, &measurement).await
}

/// Input for run_query: the query text plus options.
#[derive(serde::Deserialize)]
pub struct RunQueryInput {
    pub connection: Connection,
    #[serde(default)]
    pub secret: Option<String>,
    #[serde(default)]
    pub database: Option<String>,
    pub query: String,
    /// If true and the query is a SELECT without LIMIT, inject LIMIT.
    #[serde(default = "default_auto_limit")]
    pub auto_limit: bool,
}

fn default_auto_limit() -> bool {
    true
}

/// Hard cap on rows returned, regardless of LIMIT (ADR-0002).
pub const HARD_ROW_CAP: usize = 100_000;
/// Default LIMIT injected when auto_limit is true and no LIMIT present.
pub const DEFAULT_AUTO_LIMIT: usize = 1000;

/// Run an InfluxQL query, with auto-LIMIT injection and hard cap enforcement.
#[tauri::command]
pub async fn run_query_cmd(input: RunQueryInput) -> Result<influx::QueryResponse, AppError> {
    let query = if input.auto_limit {
        inject_limit(&input.query, DEFAULT_AUTO_LIMIT)
    } else {
        input.query.clone()
    };

    let mut results = influx::run_query(
        &input.connection,
        input.secret.as_deref(),
        input.database.as_deref(),
        &query,
    )
    .await?;

    // Enforce hard cap: truncate series values beyond HARD_ROW_CAP.
    let mut truncated = false;
    for result in &mut results {
        for series in &mut result.series {
            if series.values.len() > HARD_ROW_CAP {
                series.values.truncate(HARD_ROW_CAP);
                truncated = true;
            }
        }
    }

    Ok(influx::QueryResponse {
        results,
        auto_limit_applied: input.auto_limit && query != input.query,
        truncated,
        auto_limit_value: if input.auto_limit { Some(DEFAULT_AUTO_LIMIT) } else { None },
    })
}

/// If the query is a SELECT without a LIMIT clause, append `LIMIT n`.
/// Naive but sufficient for v1: checks for "select" prefix and "limit" absence.
fn inject_limit(query: &str, limit: usize) -> String {
    let trimmed = query.trim();
    let lower = trimmed.to_lowercase();
    if lower.starts_with("select") && !lower.contains("limit") {
        // Append before any trailing semicolon.
        if let Some(semi) = trimmed.rfind(';') {
            let (head, tail) = trimmed.split_at(semi);
            format!("{} LIMIT {}{}", head, limit, tail)
        } else {
            format!("{} LIMIT {}", trimmed, limit)
        }
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inject_limit_adds_to_select_without_limit() {
        let q = "SELECT * FROM cpu";
        assert_eq!(inject_limit(q, 1000), "SELECT * FROM cpu LIMIT 1000");
    }

    #[test]
    fn inject_limit_preserves_semicolon() {
        let q = "SELECT * FROM cpu;";
        assert_eq!(inject_limit(q, 1000), "SELECT * FROM cpu LIMIT 1000;");
    }

    #[test]
    fn inject_limit_skips_when_limit_present() {
        let q = "SELECT * FROM cpu LIMIT 5";
        assert_eq!(inject_limit(q, 1000), "SELECT * FROM cpu LIMIT 5");
    }

    #[test]
    fn inject_limit_skips_non_select() {
        let q = "SHOW DATABASES";
        assert_eq!(inject_limit(q, 1000), "SHOW DATABASES");
    }

    #[test]
    fn inject_limit_handles_lowercase_select() {
        let q = "select * from cpu";
        assert_eq!(inject_limit(q, 100), "select * from cpu LIMIT 100");
    }
}
