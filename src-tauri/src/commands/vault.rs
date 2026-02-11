use crate::state::VaultState;
use base64::{engine::general_purpose, Engine as _};
use std::sync::Mutex;
use tauri::State;

/// Unlocks the vault with the provided Base64-encoded key.
///
/// This function decodes the key, validates its length, and securely stores it in the application state.
#[tauri::command]
pub fn unlock_vault(state: State<'_, Mutex<VaultState>>, key_b64: String) -> Result<(), String> {
    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;
    unlock_vault_logic(&mut st, key_b64)
}

/// Core logic for unlocking the vault.
/// Separated for unit testing.
pub fn unlock_vault_logic(st: &mut VaultState, key_b64: String) -> Result<(), String> {
    let key_bytes = general_purpose::STANDARD
        .decode(key_b64)
        .map_err(|_| "Invalid base64 key")?;

    if key_bytes.len() != 32 {
        return Err("Key must be exactly 32 bytes".into());
    }

    // If already unlocked, wipe the old key first
    st.lock_and_wipe();

    st.enc_key = Some(key_bytes);
    st.unlocked = true;

    Ok(())
}

/// Locks the vault and securely wipes the encryption key from memory.
#[tauri::command]
pub fn lock_vault(state: State<'_, Mutex<VaultState>>) -> Result<(), String> {
    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;
    lock_vault_logic(&mut st);
    Ok(())
}

/// Core logic for locking the vault.
/// Separated for unit testing.
pub fn lock_vault_logic(st: &mut VaultState) {
    st.lock_and_wipe();
}
