use crate::error::AppError;
use crate::influx;
use crate::models::Connection;
use serde::{Deserialize, Serialize};

/// Capabilities of a target InfluxDB 1.x server, detected at connect time.
/// Governs which UI features are enabled (Token auth, server-side cancel).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ServerCapabilities {
    /// Raw version string from X-Influxdb-Version header.
    pub version: String,
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    /// Token auth (1.8+).
    pub supports_token_auth: bool,
    /// Server-side query cancellation (1.8+).
    pub supports_server_cancel: bool,
}

/// Parse a version string like "1.8.10" or "1.8.10-c1.8.10" into (major, minor, patch).
/// Returns (0, 0, 0) if unparseable.
pub fn parse_version(version: &str) -> (u32, u32, u32) {
    let clean = version
        .split(|c: char| !c.is_ascii_digit() && c != '.')
        .next()
        .unwrap_or(version);
    let parts: Vec<&str> = clean.split('.').collect();
    let major = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
    let minor = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    let patch = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
    (major, minor, patch)
}

/// Build a ServerCapabilities from a version string.
pub fn capabilities_from_version(version: &str) -> ServerCapabilities {
    let (major, minor, patch) = parse_version(version);
    // Token auth and server-side cancel both landed in 1.8.
    let ge_1_8 = (major > 1) || (major == 1 && minor >= 8);
    ServerCapabilities {
        version: version.to_string(),
        major,
        minor,
        patch,
        supports_token_auth: ge_1_8,
        supports_server_cancel: ge_1_8,
    }
}

/// Probe a server's capabilities by pinging it and parsing the version header.
pub async fn probe_capabilities(
    conn: &Connection,
    secret: Option<&str>,
) -> Result<ServerCapabilities, AppError> {
    let ping = influx::test_connection(conn, secret).await?;
    Ok(capabilities_from_version(&ping.version))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_standard_version() {
        assert_eq!(parse_version("1.8.10"), (1, 8, 10));
    }

    #[test]
    fn parse_version_with_suffix() {
        assert_eq!(parse_version("1.8.10-c1.8.10"), (1, 8, 10));
    }

    #[test]
    fn parse_two_part_version() {
        assert_eq!(parse_version("1.7"), (1, 7, 0));
    }

    #[test]
    fn parse_unparseable_returns_zeros() {
        assert_eq!(parse_version("unknown"), (0, 0, 0));
    }

    #[test]
    fn capabilities_1_7_disables_token_and_cancel() {
        let caps = capabilities_from_version("1.7.6");
        assert!(!caps.supports_token_auth);
        assert!(!caps.supports_server_cancel);
    }

    #[test]
    fn capabilities_1_8_enables_token_and_cancel() {
        let caps = capabilities_from_version("1.8.10");
        assert!(caps.supports_token_auth);
        assert!(caps.supports_server_cancel);
    }

    #[test]
    fn capabilities_2_x_enables_all() {
        let caps = capabilities_from_version("2.0.0");
        assert!(caps.supports_token_auth);
        assert!(caps.supports_server_cancel);
    }

    #[test]
    fn capabilities_roundtrips_serde() {
        let caps = capabilities_from_version("1.8.10");
        let json = serde_json::to_string(&caps).unwrap();
        let back: ServerCapabilities = serde_json::from_str(&json).unwrap();
        assert_eq!(caps, back);
    }

    use wiremock::{Mock, MockServer, ResponseTemplate};
    use wiremock::matchers::{method, path};

    #[tokio::test]
    async fn probe_returns_capabilities_from_header() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .respond_with(
                ResponseTemplate::new(204)
                    .insert_header("X-Influxdb-Version", "1.8.10"),
            )
            .mount(&server)
            .await;

        let conn = Connection {
            id: "t".into(),
            name: "t".into(),
            url: server.uri(),
            default_database: None,
            skip_tls_verify: false,
            auth: crate::models::AuthConfig::None,
        };

        let caps = probe_capabilities(&conn, None).await.unwrap();
        assert_eq!(caps.version, "1.8.10");
        assert!(caps.supports_token_auth);
        assert!(caps.supports_server_cancel);
    }

    #[tokio::test]
    async fn probe_against_1_7_disables_features() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .respond_with(
                ResponseTemplate::new(204)
                    .insert_header("X-Influxdb-Version", "1.7.6"),
            )
            .mount(&server)
            .await;

        let conn = Connection {
            id: "t".into(),
            name: "t".into(),
            url: server.uri(),
            default_database: None,
            skip_tls_verify: false,
            auth: crate::models::AuthConfig::None,
        };

        let caps = probe_capabilities(&conn, None).await.unwrap();
        assert!(!caps.supports_token_auth);
        assert!(!caps.supports_server_cancel);
    }
}
