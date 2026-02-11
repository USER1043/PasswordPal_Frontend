use passwordpal_lib::commands::vault::{unlock_vault_logic, lock_vault_logic};
use passwordpal_lib::state::VaultState;

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
