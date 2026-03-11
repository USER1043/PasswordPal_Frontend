use crate::models::{VaultEntry, VaultRecord};
use crate::state::VaultState;
use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, State};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SyncQueueItem {
    pub id: String,
    pub user_id: String,
    pub encrypted_data: String,
    pub nonce: String,
    pub version: i64,
    pub sync_status: String,
    pub record_type: String,
}

pub fn init_db(app_handle: &AppHandle) -> SqlResult<Connection> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
    let db_path = app_data_dir.join("passwordpal.db");

    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_vault (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            encrypted_data TEXT NOT NULL,
            nonce TEXT NOT NULL,
            version INTEGER NOT NULL,
            sync_status TEXT NOT NULL,
            record_type TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS auth_cache (
            email TEXT PRIMARY KEY,
            salt TEXT NOT NULL,
            wrapped_mek TEXT NOT NULL,
            local_password_hash TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS local_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Check if device_id exists
    let mut count: i64 = 0;
    if let Ok(c) = conn.query_row("SELECT count(*) FROM local_config WHERE key = 'device_id'", [], |r| r.get(0)) {
        count = c;
    }

    if count == 0 {
        let uuid_str = uuid::Uuid::new_v4().to_string();
        let os_name = std::env::consts::OS; // e.g., "linux"
        let username = whoami::username().unwrap_or_else(|_| "UnknownUser".to_string());
        let device_name = format!("{}/{}", os_name, username);
        conn.execute("INSERT INTO local_config (key, value) VALUES ('device_id', ?1)", params![uuid_str])?;
        conn.execute("INSERT INTO local_config (key, value) VALUES ('device_name', ?1)", params![device_name])?;
    }

    Ok(conn)
}

fn split_blob(blob_b64: &str) -> Result<(String, String), String> {
    use base64::{engine::general_purpose, Engine as _};
    let payload = general_purpose::STANDARD
        .decode(blob_b64)
        .map_err(|_| "Invalid base64 payload")?;
    if payload.len() < 12 {
        return Err("Payload too short".into());
    }
    let (nonce_bytes, ciphertext_bytes) = payload.split_at(12);
    Ok((
        general_purpose::STANDARD.encode(nonce_bytes),
        general_purpose::STANDARD.encode(ciphertext_bytes),
    ))
}

fn combine_blob(nonce_b64: &str, ciphertext_b64: &str) -> Result<String, String> {
    use base64::{engine::general_purpose, Engine as _};
    let mut nonce = general_purpose::STANDARD
        .decode(nonce_b64)
        .map_err(|_| "Invalid nonce base64")?;
    let ciphertext = general_purpose::STANDARD
        .decode(ciphertext_b64)
        .map_err(|_| "Invalid ciphertext base64")?;
    nonce.extend_from_slice(&ciphertext);
    Ok(general_purpose::STANDARD.encode(nonce))
}

#[command]
#[allow(clippy::too_many_arguments)]
pub fn save_entry_local(
    db_state: State<'_, DbState>,
    vault_state: State<'_, Mutex<VaultState>>,
    entry_id: String,
    user_id: String,
    entry: VaultEntry,
    version: i64,
    record_type: String,
    sync_status: String,
) -> Result<(), String> {
    let st = vault_state.lock().map_err(|_| "VaultState corrupted")?;

    // 1. Encrypt in Rust RAM before hitting SQLite
    let blob_b64 = crate::commands::entry::encrypt_entry_logic(&st, &entry)?;
    let (nonce, encrypted_data) = split_blob(&blob_b64)?;

    let conn = db_state.conn.lock().map_err(|_| "DbState corrupted")?;
    conn.execute(
        "INSERT INTO local_vault (id, user_id, encrypted_data, nonce, version, sync_status, record_type)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
         encrypted_data=excluded.encrypted_data,
         nonce=excluded.nonce,
         version=excluded.version,
         sync_status=excluded.sync_status,
         record_type=excluded.record_type",
        params![
            entry_id, user_id, encrypted_data, nonce, version, sync_status, record_type
        ],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn save_server_record_local(
    db_state: State<'_, DbState>,
    id: String,
    user_id: String,
    encrypted_data: String,
    nonce: String,
    version: i64,
    record_type: String,
) -> Result<(), String> {
    let conn = db_state.conn.lock().map_err(|_| "DbState corrupted")?;
    conn.execute(
        "INSERT INTO local_vault (id, user_id, encrypted_data, nonce, version, sync_status, record_type)
         VALUES (?1, ?2, ?3, ?4, ?5, 'synced', ?6)
         ON CONFLICT(id) DO UPDATE SET
         encrypted_data=excluded.encrypted_data,
         nonce=excluded.nonce,
         version=excluded.version,
         sync_status=excluded.sync_status,
         record_type=excluded.record_type",
        params![id, user_id, encrypted_data, nonce, version, record_type],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn fetch_vault_local(
    db_state: State<'_, DbState>,
    vault_state: State<'_, Mutex<VaultState>>,
    user_id: String,
) -> Result<Vec<VaultRecord>, String> {
    let st = vault_state.lock().map_err(|_| "VaultState corrupted")?;

    let conn = db_state.conn.lock().map_err(|_| "DbState corrupted")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, encrypted_data, nonce, version, sync_status, record_type 
         FROM local_vault 
         WHERE user_id = ?1 AND sync_status != 'pending_delete'",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut decrypted_vault = Vec::new();

    for (id, encrypted_data, nonce, version, sync_status, record_type) in rows.flatten() {
        // 2. Decrypt entirely in Rust RAM. Send plaintext to frontend over IPC.
        if let Ok(blob_b64) = combine_blob(&nonce, &encrypted_data) {
            if let Ok(plaintext_entry) = crate::commands::entry::decrypt_entry_logic(&st, &blob_b64)
            {
                decrypted_vault.push(VaultRecord {
                    id,
                    entry: plaintext_entry,
                    version,
                    sync_status,
                    record_type,
                });
            }
        }
    }

    Ok(decrypted_vault)
}

#[command]
pub fn mark_deleted_local(
    state: State<'_, DbState>,
    id: String,
    hard_delete: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    if hard_delete {
        conn.execute("DELETE FROM local_vault WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE local_vault SET sync_status = 'pending_delete' WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub fn get_pending_sync_queue(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Vec<SyncQueueItem>, String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, encrypted_data, nonce, version, sync_status, record_type 
         FROM local_vault 
         WHERE user_id = ?1 AND sync_status != 'synced'",
        )
        .map_err(|e| e.to_string())?;

    let queue = stmt
        .query_map(params![user_id], |row| {
            Ok(SyncQueueItem {
                id: row.get(0)?,
                user_id: user_id.clone(),
                encrypted_data: row.get(1)?,
                nonce: row.get(2)?,
                version: row.get(3)?,
                sync_status: row.get(4)?,
                record_type: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    Ok(queue)
}

#[command]
pub fn mark_synced_local(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    conn.execute(
        "UPDATE local_vault SET sync_status = 'synced' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CachedAuthParams {
    pub salt: String,
    pub wrapped_mek: String,
    pub local_password_hash: String,
}

#[command]
pub fn cache_auth_params(
    state: State<'_, DbState>,
    email: String,
    salt: String,
    wrapped_mek: String,
    local_password_hash: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    conn.execute(
        "INSERT INTO auth_cache (email, salt, wrapped_mek, local_password_hash)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(email) DO UPDATE SET
         salt=excluded.salt,
         wrapped_mek=excluded.wrapped_mek,
         local_password_hash=excluded.local_password_hash",
        params![email, salt, wrapped_mek, local_password_hash],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub fn get_cached_auth_params(
    state: State<'_, DbState>,
    email: String,
) -> Result<Option<CachedAuthParams>, String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    let mut stmt = conn
        .prepare("SELECT salt, wrapped_mek, local_password_hash FROM auth_cache WHERE email = ?1")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(params![email]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(CachedAuthParams {
            salt: row.get(0).map_err(|e| e.to_string())?,
            wrapped_mek: row.get(1).map_err(|e| e.to_string())?,
            local_password_hash: row.get(2).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalIdentity {
    pub device_id: String,
    pub device_name: String,
}

#[command]
pub fn get_local_identity(state: State<'_, DbState>) -> Result<LocalIdentity, String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    let device_id: String = conn.query_row("SELECT value FROM local_config WHERE key = 'device_id'", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    let device_name: String = conn.query_row("SELECT value FROM local_config WHERE key = 'device_name'", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(LocalIdentity { device_id, device_name })
}

#[command]
pub fn clear_local_auth_cache(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|_| "DbState corrupted")?;
    // Execute deletions to isolate account data natively
    conn.execute("DELETE FROM auth_cache", params![])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM local_vault", params![])
        .map_err(|e| e.to_string())?;
    // EXPLICITLY EXEMPT: local_config is kept to preserve persistent specific device identity (UUID + formatted device name)
    Ok(())
}
