use crate::error::AppError;
use crate::models::{AuthConfig, Connection};

/// Build a reqwest client honoring the Connection's TLS-skip setting.
pub fn build_http_client(conn: &Connection) -> Result<reqwest::Client, AppError> {
    let mut builder = reqwest::Client::builder().timeout(std::time::Duration::from_secs(30));
    if conn.skip_tls_verify {
        builder = builder
            .danger_accept_invalid_certs(true)
            .use_rustls_tls();
    } else {
        builder = builder.use_rustls_tls();
    }
    builder.build().map_err(|e| AppError::Internal(e.to_string()))
}

/// Apply auth headers to a request builder based on the Connection's AuthConfig.
/// `secret` is the password (Basic) or token (Token) fetched from keyring.
pub fn apply_auth(
    req: reqwest::RequestBuilder,
    conn: &Connection,
    secret: Option<&str>,
) -> reqwest::RequestBuilder {
    match &conn.auth {
        AuthConfig::None => req,
        AuthConfig::Basic { username } => {
            req.basic_auth(username, secret)
        }
        AuthConfig::Token => {
            if let Some(tok) = secret {
                req.header("Authorization", format!("Token {}", tok))
            } else {
                req
            }
        }
    }
}

/// Result of a ping/test_connection call.
#[derive(Debug, Clone, serde::Serialize)]
pub struct PingResult {
    pub version: String,
    pub reachable: bool,
}

/// Test connectivity by hitting GET /ping. Returns the InfluxDB version
/// from the X-Influxdb-Version response header.
pub async fn test_connection(conn: &Connection, secret: Option<&str>) -> Result<PingResult, AppError> {
    let client = build_http_client(conn)?;
    let url = format!("{}/ping", conn.normalized_base_url());
    let req = apply_auth(client.get(&url), conn, secret);
    let resp = req.send().await.map_err(AppError::from)?;
    let version = resp
        .headers()
        .get("X-Influxdb-Version")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown")
        .to_string();
    if resp.status().is_success() {
        Ok(PingResult { version, reachable: true })
    } else {
        Err(AppError::InfluxError {
            code: resp.status().as_u16(),
            message: format!("ping returned {}", resp.status()),
        })
    }
}

/// A single InfluxDB result series: columns + rows of values.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Series {
    pub name: String,
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
}

/// A single InfluxDB query result (one statement).
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QueryResult {
    #[serde(default)]
    pub statement_id: u32,
    #[serde(default)]
    pub series: Vec<Series>,
    #[serde(default)]
    pub error: Option<String>,
}

/// The top-level InfluxDB /query response, augmented with client-side metadata.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct QueryResponse {
    pub results: Vec<QueryResult>,
    /// True if auto-LIMIT was injected (ADR-0002).
    #[serde(default)]
    pub auto_limit_applied: bool,
    /// True if the hard cap truncated the result set.
    #[serde(default)]
    pub truncated: bool,
    /// The LIMIT value injected, if any.
    #[serde(default)]
    pub auto_limit_value: Option<usize>,
}

/// Run an InfluxQL query (GET /query). Returns parsed results.
pub async fn run_query(
    conn: &Connection,
    secret: Option<&str>,
    database: Option<&str>,
    query: &str,
) -> Result<Vec<QueryResult>, AppError> {
    let client = build_http_client(conn)?;
    let url = format!("{}/query", conn.normalized_base_url());
    let mut req = apply_auth(client.get(&url), conn, secret)
        .query(&[("q", query)]);
    if let Some(db) = database {
        req = req.query(&[("db", db)]);
    }
    let resp = req.send().await.map_err(AppError::from)?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| AppError::Internal(e.to_string()))?;
    if !status.is_success() {
        // InfluxDB errors come as JSON with an "error" field or plain text.
        if let Ok(parsed) = serde_json::from_str::<QueryResponse>(&body) {
            if let Some(first) = parsed.results.first() {
                if let Some(err) = &first.error {
                    return Err(AppError::InfluxError {
                        code: status.as_u16(),
                        message: err.clone(),
                    });
                }
            }
        }
        return Err(AppError::InfluxError {
            code: status.as_u16(),
            message: body.chars().take(500).collect(),
        });
    }
    let parsed: QueryResponse = serde_json::from_str(&body)?;
    Ok(parsed.results)
}

/// List all databases via SHOW DATABASES. Returns the database names.
pub async fn list_databases(
    conn: &Connection,
    secret: Option<&str>,
) -> Result<Vec<String>, AppError> {
    let results = run_query(conn, secret, None, "SHOW DATABASES").await?;
    Ok(extract_first_column_strings(&results))
}

/// List measurements in a database via SHOW MEASUREMENTS.
pub async fn list_measurements(
    conn: &Connection,
    secret: Option<&str>,
    database: &str,
) -> Result<Vec<String>, AppError> {
    let results = run_query(conn, secret, Some(database), "SHOW MEASUREMENTS").await?;
    Ok(extract_first_column_strings(&results))
}

/// List tag keys for a measurement via SHOW TAG KEYS.
pub async fn list_tag_keys(
    conn: &Connection,
    secret: Option<&str>,
    database: &str,
    measurement: &str,
) -> Result<Vec<String>, AppError> {
    let q = format!("SHOW TAG KEYS FROM \"{}\"", measurement);
    let results = run_query(conn, secret, Some(database), &q).await?;
    Ok(extract_first_column_strings(&results))
}

/// List field keys for a measurement via SHOW FIELD KEYS.
pub async fn list_field_keys(
    conn: &Connection,
    secret: Option<&str>,
    database: &str,
    measurement: &str,
) -> Result<Vec<String>, AppError> {
    let q = format!("SHOW FIELD KEYS FROM \"{}\"", measurement);
    let results = run_query(conn, secret, Some(database), &q).await?;
    Ok(extract_first_column_strings(&results))
}

/// Extract the first column of the first series as strings.
fn extract_first_column_strings(results: &[QueryResult]) -> Vec<String> {
    let mut out = Vec::new();
    if let Some(first) = results.first() {
        for series in &first.series {
            for row in &series.values {
                if let Some(val) = row.first() {
                    if let Some(s) = val.as_str() {
                        out.push(s.to_string());
                    }
                }
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn conn_for(server: &MockServer) -> Connection {
        Connection {
            id: "test".to_string(),
            name: "test".to_string(),
            url: server.uri(),
            default_database: None,
            skip_tls_verify: false,
            auth: AuthConfig::None,
        }
    }

    #[tokio::test]
    async fn test_connection_returns_version_on_success() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .respond_with(
                ResponseTemplate::new(204)
                    .insert_header("X-Influxdb-Version", "1.8.10"),
            )
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let result = test_connection(&conn, None).await.unwrap();
        assert!(result.reachable);
        assert_eq!(result.version, "1.8.10");
    }

    #[tokio::test]
    async fn test_connection_returns_influx_error_on_failure() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let result = test_connection(&conn, None).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::InfluxError { code, .. } => assert_eq!(code, 401),
            other => panic!("expected InfluxError, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_connection_applies_basic_auth_header() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .and(header("authorization", "Basic YWRtaW46c2VjcmV0"))
            .respond_with(
                ResponseTemplate::new(204)
                    .insert_header("X-Influxdb-Version", "1.8.10"),
            )
            .mount(&server)
            .await;

        let mut conn = conn_for(&server);
        conn.auth = AuthConfig::Basic {
            username: "admin".to_string(),
        };
        let result = test_connection(&conn, Some("secret")).await.unwrap();
        assert!(result.reachable);
    }

    #[tokio::test]
    async fn test_connection_applies_token_auth_header() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/ping"))
            .and(header("authorization", "Token mytoken123"))
            .respond_with(
                ResponseTemplate::new(204)
                    .insert_header("X-Influxdb-Version", "1.8.10"),
            )
            .mount(&server)
            .await;

        let mut conn = conn_for(&server);
        conn.auth = AuthConfig::Token;
        let result = test_connection(&conn, Some("mytoken123")).await.unwrap();
        assert!(result.reachable);
    }

    #[tokio::test]
    async fn list_databases_returns_names() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/query"))
            .and(wiremock::matchers::query_param("q", "SHOW DATABASES"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "results": [{
                    "statement_id": 0,
                    "series": [{
                        "name": "databases",
                        "columns": ["name"],
                        "values": [["_internal"], ["mydb"], ["telegraf"]]
                    }]
                }]
            })))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let dbs = list_databases(&conn, None).await.unwrap();
        assert_eq!(dbs, vec!["_internal", "mydb", "telegraf"]);
    }

    #[tokio::test]
    async fn list_measurements_returns_names() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/query"))
            .and(wiremock::matchers::query_param("q", "SHOW MEASUREMENTS"))
            .and(wiremock::matchers::query_param("db", "mydb"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "results": [{
                    "statement_id": 0,
                    "series": [{
                        "name": "measurements",
                        "columns": ["name"],
                        "values": [["cpu"], ["mem"], ["disk"]]
                    }]
                }]
            })))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let ms = list_measurements(&conn, None, "mydb").await.unwrap();
        assert_eq!(ms, vec!["cpu", "mem", "disk"]);
    }

    #[tokio::test]
    async fn list_tag_keys_returns_keys() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/query"))
            .and(wiremock::matchers::query_param("db", "mydb"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "results": [{
                    "statement_id": 0,
                    "series": [{
                        "name": "cpu",
                        "columns": ["tagKey"],
                        "values": [["host"], ["region"]]
                    }]
                }]
            })))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let keys = list_tag_keys(&conn, None, "mydb", "cpu").await.unwrap();
        assert_eq!(keys, vec!["host", "region"]);
    }

    #[tokio::test]
    async fn list_field_keys_returns_keys() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/query"))
            .and(wiremock::matchers::query_param("db", "mydb"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "results": [{
                    "statement_id": 0,
                    "series": [{
                        "name": "cpu",
                        "columns": ["fieldKey", "fieldType"],
                        "values": [["usage_idle", "float"], ["usage_user", "float"]]
                    }]
                }]
            })))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let keys = list_field_keys(&conn, None, "mydb", "cpu").await.unwrap();
        assert_eq!(keys, vec!["usage_idle", "usage_user"]);
    }

    #[tokio::test]
    async fn run_query_returns_error_on_400() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/query"))
            .respond_with(ResponseTemplate::new(400).set_body_json(serde_json::json!({
                "results": [{
                    "statement_id": 0,
                    "error": "unable to parse query"
                }]
            })))
            .mount(&server)
            .await;

        let conn = conn_for(&server);
        let result = run_query(&conn, None, None, "BAD QUERY").await;
        match result.unwrap_err() {
            AppError::InfluxError { code, message } => {
                assert_eq!(code, 400);
                assert_eq!(message, "unable to parse query");
            }
            other => panic!("expected InfluxError, got {:?}", other),
        }
    }
}
