// Integration tests for vault state locking and wiping

mod common;

use common::get_test_key;
use passwordpal_lib::commands::vault::lock_vault_logic;
use passwordpal_lib::state::VaultState;

#[test]
fn test_lock_vault() {
    let mut state = VaultState::default();
    state.unlock(get_test_key());

    assert!(state.is_unlocked());
    assert!(state.key().is_some());

    lock_vault_logic(&mut state);

    // Check if the vault is locked and the enc key is wiped
    assert!(!state.is_unlocked());
    assert!(state.key().is_none());
}

#[test]
fn test_lock_already_locked_vault() {
    let mut state = VaultState::default();

    // Lock an already locked vault - should not panic
    lock_vault_logic(&mut state);
    assert!(!state.is_unlocked());
    assert!(state.key().is_none());
}

#[test]
fn test_vault_state_unlock_lock_cycle() {
    let mut state = VaultState::default();
    let key = get_test_key();

    // Unlock directly
    state.unlock(key.clone());
    assert!(state.is_unlocked());
    assert_eq!(state.key().unwrap(), &key);

    // Lock
    lock_vault_logic(&mut state);
    assert!(!state.is_unlocked());
    assert!(state.key().is_none());

    // Unlock again
    state.unlock(key.clone());
    assert!(state.is_unlocked());
    assert_eq!(state.key().unwrap(), &key);
}
