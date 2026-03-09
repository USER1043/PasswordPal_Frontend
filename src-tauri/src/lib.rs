// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

pub mod commands;
pub mod crypto;
pub mod models;
pub mod state;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(state::VaultState::default()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::entry::encrypt_entry,
            commands::entry::decrypt_entry,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::auth::change_password_optimization,
            commands::auth::register_vault,
            commands::auth::login_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
