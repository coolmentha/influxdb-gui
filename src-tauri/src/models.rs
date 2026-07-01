use serde::{Deserialize, Serialize};

/// How a Connection authenticates against InfluxDB 1.x.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum AuthConfig {
    /// No authentication.
    None,
    /// HTTP Basic Auth with username + password.
    Basic { username: String },
    /// Bearer token (InfluxDB 1.8+).
    Token,
}

/// A saved InfluxDB 1.x server connection. Passwords/tokens live in the OS
/// keyring, never in this struct's serialized form.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub default_database: Option<String>,
    #[serde(default)]
    pub skip_tls_verify: bool,
    pub auth: AuthConfig,
}

impl Connection {
    /// Build the full InfluxDB base URL, ensuring it has no trailing slash.
    pub fn normalized_base_url(&self) -> String {
        self.url.trim_end_matches('/').to_string()
    }
}
