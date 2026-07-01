pub mod capabilities;
pub mod commands;
pub mod error;
pub mod influx;
pub mod models;
pub mod registry;

/// Pure helper that builds the greeting string. Extracted from the
/// `greet` command so it can be unit-tested without spinning up Tauri.
pub fn build_greeting(name: &str) -> String {
    let trimmed = name.trim();
    let target = if trimmed.is_empty() { "world" } else { trimmed };
    format!("Hello, {}! You've been greeted from Rust!", target)
}

#[tauri::command]
fn greet(name: &str) -> String {
    build_greeting(name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::list_connections,
            commands::save_connection,
            commands::delete_connection,
            commands::test_connection_cmd,
            commands::probe_capabilities_cmd,
            commands::get_secret,
            commands::list_databases_cmd,
            commands::list_measurements_cmd,
            commands::list_tag_keys_cmd,
            commands::list_field_keys_cmd,
            commands::run_query_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_greeting_uses_given_name() {
        assert_eq!(
            build_greeting("InfluxDB"),
            "Hello, InfluxDB! You've been greeted from Rust!"
        );
    }

    #[test]
    fn build_greeting_falls_back_to_world_for_empty() {
        assert_eq!(
            build_greeting(""),
            "Hello, world! You've been greeted from Rust!"
        );
    }
}
