// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

pub mod commands;
pub mod crypto;
pub mod db;
pub mod models;
pub mod state;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let db_conn = db::init_db(handle).expect("Failed to initialize rusqlite database");
            app.manage(db::DbState {
                conn: Mutex::new(db_conn),
            });
            Ok(())
        })
        .manage(Mutex::new(state::VaultState::default()))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::entry::encrypt_entry,
            commands::entry::decrypt_entry,
            commands::vault::unlock_vault,
            commands::vault::lock_vault,
            commands::auth::change_password_optimization,
            commands::auth::register_vault,
            commands::auth::login_vault,
            commands::auth::recover_vault,
            commands::os::get_os_info,
            db::save_entry_local,
            db::save_server_record_local,
            db::fetch_vault_local,
            db::mark_deleted_local,
            db::get_pending_sync_queue,
            db::mark_synced_local,
            db::cache_auth_params,
            db::get_cached_auth_params,
            db::clear_local_auth_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
