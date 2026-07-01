use serde::Serialize;
use thiserror::Error;

/// The single error type surfaced to the frontend via Tauri commands.
/// Each variant maps to a user-facing message and an ErrorLog entry.
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "detail")]
pub enum AppError {
    #[error("network error: {0}")]
    Network(String),

    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("TLS error: {0}")]
    Tls(String),

    #[error("InfluxDB error {code}: {message}")]
    InfluxError { code: u16, message: String },

    #[error("request timed out after {0}s")]
    Timeout(u64),

    #[error("query cancelled")]
    Cancelled,

    #[error("result limit exceeded: {returned} rows returned, truncated")]
    LimitExceeded { returned: usize, truncated: bool },

    #[error("write operation '{verb}' not supported in v1")]
    WriteNotSupported { verb: String },

    #[error("not found: {0}")]
    NotFound(String),

    #[error("internal error: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        if e.is_timeout() {
            AppError::Timeout(30)
        } else if e.is_connect() {
            AppError::Network(e.to_string())
        } else {
            AppError::Network(e.to_string())
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Internal(format!("json: {}", e))
    }
}
