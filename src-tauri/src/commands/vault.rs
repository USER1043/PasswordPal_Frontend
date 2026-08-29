use crate::state::VaultState;
use std::sync::Mutex;
use tauri::State;

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
    st.lock();
}
