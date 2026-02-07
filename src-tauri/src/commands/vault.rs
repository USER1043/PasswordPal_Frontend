use tauri::State;
use std::sync::Mutex;
use base64::{engine::general_purpose, Engine as _};
use crate::state::VaultState;

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::VaultState;

    #[test]
    fn test_unlock_vault_success() {
        let mut state = VaultState::default();
        // 32-byte key in base64 (all zeros)
        let valid_key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
        
        let result = unlock_vault_logic(&mut state, valid_key.to_string());
        assert!(result.is_ok());
        assert!(state.unlocked);
        assert!(state.enc_key.is_some());
        assert_eq!(state.enc_key.unwrap().len(), 32);
    }

    #[test]
    fn test_unlock_vault_invalid_base64() {
        let mut state = VaultState::default();
        let result = unlock_vault_logic(&mut state, "!!!".to_string());
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "Invalid base64 key");
        assert!(!state.unlocked);
    }

    #[test]
    fn test_unlock_vault_wrong_length() {
        let mut state = VaultState::default();
        // "AAAA" decodes to 3 bytes
        let result = unlock_vault_logic(&mut state, "AAAA".to_string());
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "Key must be exactly 32 bytes");
        assert!(!state.unlocked);
    }

     #[test]
    fn test_lock_vault() {
        // Create a new vault state
        let mut state = VaultState::default();
        state.enc_key = Some(vec![0; 32]);
        state.unlocked = true;

        lock_vault_logic(&mut state);
        // Check if the vault is locked and the enc key is wiped
        assert!(!state.unlocked);
        assert!(state.enc_key.is_none());
    }
}
