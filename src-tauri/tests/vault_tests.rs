// Integration tests for vault operations
// Tests moved from src/commands/vault.rs and additional test cases

mod common;

use base64::{engine::general_purpose, Engine as _};
use common::get_test_key_b64;
use passwordpal_lib::commands::vault::{lock_vault_logic, unlock_vault_logic};
use passwordpal_lib::state::VaultState;

// ============================================================================
// EXISTING TESTS (moved from vault.rs)
// ============================================================================

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

// ============================================================================
// NEW TESTS (additional coverage)
// ============================================================================

#[test]
fn test_unlock_lock_cycle() {
    let mut state = VaultState::default();
    let key = get_test_key_b64();

    // Unlock
    let result = unlock_vault_logic(&mut state, key.clone());
    assert!(result.is_ok());
    assert!(state.unlocked);
    assert!(state.enc_key.is_some());

    // Lock
    lock_vault_logic(&mut state);
    assert!(!state.unlocked);
    assert!(state.enc_key.is_none());

    // Unlock again
    let result2 = unlock_vault_logic(&mut state, key);
    assert!(result2.is_ok());
    assert!(state.unlocked);
    assert!(state.enc_key.is_some());
}

#[test]
fn test_unlock_while_already_unlocked() {
    let mut state = VaultState::default();
    let key1 = get_test_key_b64();

    // First unlock
    unlock_vault_logic(&mut state, key1).unwrap();
    assert!(state.unlocked);

    // Create a different key
    let key2_bytes = vec![0xFFu8; 32];
    let key2 = general_purpose::STANDARD.encode(key2_bytes.clone());

    // Unlock again with different key - should replace the old key
    let result = unlock_vault_logic(&mut state, key2);
    assert!(result.is_ok());
    assert!(state.unlocked);
    assert_eq!(state.enc_key.unwrap(), key2_bytes);
}

#[test]
fn test_lock_already_locked_vault() {
    let mut state = VaultState::default();

    // Lock an already locked vault - should not panic
    lock_vault_logic(&mut state);
    assert!(!state.unlocked);
    assert!(state.enc_key.is_none());
}

#[test]
fn test_unlock_with_various_key_lengths() {
    let mut state = VaultState::default();

    // 16 bytes (too short)
    let key_16 = general_purpose::STANDARD.encode(vec![0u8; 16]);
    let result = unlock_vault_logic(&mut state, key_16);
    assert!(result.is_err());

    // 64 bytes (too long)
    let key_64 = general_purpose::STANDARD.encode(vec![0u8; 64]);
    let result = unlock_vault_logic(&mut state, key_64);
    assert!(result.is_err());

    // 31 bytes (off by one)
    let key_31 = general_purpose::STANDARD.encode(vec![0u8; 31]);
    let result = unlock_vault_logic(&mut state, key_31);
    assert!(result.is_err());

    // 33 bytes (off by one)
    let key_33 = general_purpose::STANDARD.encode(vec![0u8; 33]);
    let result = unlock_vault_logic(&mut state, key_33);
    assert!(result.is_err());
}

#[test]
fn test_unlock_with_all_different_byte_values() {
    let mut state = VaultState::default();

    // Test with different byte patterns
    let patterns = vec![
        vec![0x00u8; 32],             // All zeros
        vec![0xFFu8; 32],             // All ones
        vec![0x55u8; 32],             // Alternating pattern
        vec![0xAAu8; 32],             // Alternating pattern (inverse)
        (0..32).collect::<Vec<u8>>(), // Sequential
    ];

    for pattern in patterns {
        let key = general_purpose::STANDARD.encode(&pattern);
        let result = unlock_vault_logic(&mut state, key);
        assert!(result.is_ok());
        assert_eq!(state.enc_key.as_ref().unwrap(), &pattern);
        lock_vault_logic(&mut state); // Reset for next iteration
    }
}

#[test]
fn test_state_after_failed_unlock() {
    let mut state = VaultState::default();

    // Try to unlock with invalid key
    let result = unlock_vault_logic(&mut state, "invalid".to_string());
    assert!(result.is_err());

    // State should remain locked
    assert!(!state.unlocked);
    assert!(state.enc_key.is_none());

    // Should be able to unlock with valid key after failed attempt
    let valid_key = get_test_key_b64();
    let result2 = unlock_vault_logic(&mut state, valid_key);
    assert!(result2.is_ok());
    assert!(state.unlocked);
}
