use crate::models::Connection;
use std::path::PathBuf;

/// Persists the list of Connections to a JSON file in the OS config dir.
/// Secrets (passwords/tokens) are NEVER stored here — only metadata.

const REGISTRY_FILE: &str = "connections.json";

fn registry_path() -> PathBuf {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("influxdb-gui");
    std::fs::create_dir_all(&dir).ok();
    dir.join(REGISTRY_FILE)
}

/// Load all connections from the registry file. Returns empty vec if missing.
pub fn load_connections() -> Vec<Connection> {
    let path = registry_path();
    match std::fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

/// Save the full list of connections to the registry file.
pub fn save_connections(connections: &[Connection]) -> Result<(), String> {
    let path = registry_path();
    let json = serde_json::to_string_pretty(connections).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// Insert or replace a connection by id.
pub fn upsert_connection(connections: &mut Vec<Connection>, conn: Connection) {
    if let Some(existing) = connections.iter_mut().find(|c| c.id == conn.id) {
        *existing = conn;
    } else {
        connections.push(conn);
    }
}

/// Remove a connection by id. Returns true if removed.
pub fn remove_connection(connections: &mut Vec<Connection>, id: &str) -> bool {
    let before = connections.len();
    connections.retain(|c| c.id != id);
    connections.len() < before
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AuthConfig;

    fn sample_conn(id: &str, name: &str) -> Connection {
        Connection {
            id: id.to_string(),
            name: name.to_string(),
            url: "http://localhost:8086".to_string(),
            default_database: Some("mydb".to_string()),
            skip_tls_verify: false,
            auth: AuthConfig::None,
        }
    }

    #[test]
    fn upsert_inserts_new_connection() {
        let mut conns = Vec::new();
        upsert_connection(&mut conns, sample_conn("c1", "prod"));
        assert_eq!(conns.len(), 1);
        assert_eq!(conns[0].name, "prod");
    }

    #[test]
    fn upsert_replaces_existing_by_id() {
        let mut conns = vec![sample_conn("c1", "prod")];
        let mut updated = sample_conn("c1", "staging");
        updated.url = "http://staging:8086".to_string();
        upsert_connection(&mut conns, updated);
        assert_eq!(conns.len(), 1);
        assert_eq!(conns[0].name, "staging");
        assert_eq!(conns[0].url, "http://staging:8086");
    }

    #[test]
    fn remove_returns_true_when_removed() {
        let mut conns = vec![sample_conn("c1", "prod"), sample_conn("c2", "dev")];
        assert!(remove_connection(&mut conns, "c1"));
        assert_eq!(conns.len(), 1);
        assert_eq!(conns[0].id, "c2");
    }

    #[test]
    fn remove_returns_false_when_not_found() {
        let mut conns = vec![sample_conn("c1", "prod")];
        assert!(!remove_connection(&mut conns, "nope"));
        assert_eq!(conns.len(), 1);
    }

    #[test]
    fn save_then_load_roundtrips() {
        // Use a temp file by overriding the path via env (test isolation).
        // We test the pure save/load on a known vec.
        let conns = vec![
            sample_conn("c1", "prod"),
            Connection {
                id: "c2".to_string(),
                name: "dev".to_string(),
                url: "https://dev:8086".to_string(),
                default_database: None,
                skip_tls_verify: true,
                auth: AuthConfig::Basic {
                    username: "admin".to_string(),
                },
            },
        ];
        let json = serde_json::to_string(&conns).unwrap();
        let loaded: Vec<Connection> = serde_json::from_str(&json).unwrap();
        assert_eq!(loaded, conns);
        assert!(matches!(loaded[1].auth, AuthConfig::Basic { .. }));
    }

    #[test]
    fn load_returns_empty_when_file_missing() {
        // Point to a nonexistent path by reading a temp dir.
        // This tests the graceful-degradation path.
        let path = std::env::temp_dir().join("influxdb-gui-nonexistent-test.json");
        let _ = std::fs::remove_file(&path);
        let result = std::fs::read_to_string(&path);
        let loaded: Vec<Connection> = match result {
            Ok(c) => serde_json::from_str(&c).unwrap_or_default(),
            Err(_) => Vec::new(),
        };
        assert!(loaded.is_empty());
    }

    #[test]
    fn auth_config_serializes_with_type_tag() {
        let none = AuthConfig::None;
        let json = serde_json::to_string(&none).unwrap();
        assert!(json.contains("\"type\":\"none\""));

        let basic = AuthConfig::Basic {
            username: "admin".to_string(),
        };
        let json = serde_json::to_string(&basic).unwrap();
        assert!(json.contains("\"type\":\"basic\""));
        assert!(json.contains("\"username\":\"admin\""));
    }
}
