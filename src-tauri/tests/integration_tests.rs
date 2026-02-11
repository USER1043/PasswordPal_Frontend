// End-to-end integration tests
// Tests complete workflows across multiple modules

mod common;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use common::{derive_test_key, get_test_key_b64, get_test_salt, get_test_salt_b64};
use passwordpal_lib::commands::auth::change_password_optimization;
use passwordpal_lib::commands::entry::{decrypt_entry_logic, encrypt_entry_logic};
use passwordpal_lib::commands::vault::{lock_vault_logic, unlock_vault_logic};
use passwordpal_lib::models::VaultEntry;
use passwordpal_lib::state::VaultState;

// ============================================================================
// END-TO-END WORKFLOW TESTS
// ============================================================================

#[test]
fn test_complete_vault_workflow() {
    let mut state = VaultState::default();

    // 1. Unlock vault
    let key = get_test_key_b64();
    let unlock_result = unlock_vault_logic(&mut state, key);
    assert!(unlock_result.is_ok());
    assert!(state.unlocked);

    // 2. Create and encrypt an entry
    let entry = VaultEntry {
        folder_name: "Work".into(),
        website_url: "github.com".into(),
        tags: vec!["dev".into(), "important".into()],
        password: "my_secret_password".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();

    // 3. Decrypt the entry
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();
    assert_eq!(decrypted.password, entry.password);

    // 4. Lock vault
    lock_vault_logic(&mut state);
    assert!(!state.unlocked);

    // 5. Verify operations fail when locked
    let encrypt_result = encrypt_entry_logic(&state, &entry);
    assert!(encrypt_result.is_err());

    let decrypt_result = decrypt_entry_logic(&state, &encrypted);
    assert!(decrypt_result.is_err());
}

#[test]
fn test_multiple_entries_workflow() {
    let mut state = VaultState::default();
    unlock_vault_logic(&mut state, get_test_key_b64()).unwrap();

    // Create multiple entries
    let entries = vec![
        VaultEntry {
            folder_name: "Personal".into(),
            website_url: "facebook.com".into(),
            tags: vec!["social".into()],
            password: "fb_pass123".into(),
        },
        VaultEntry {
            folder_name: "Work".into(),
            website_url: "slack.com".into(),
            tags: vec!["work".into(), "communication".into()],
            password: "slack_pass456".into(),
        },
        VaultEntry {
            folder_name: "Finance".into(),
            website_url: "bank.com".into(),
            tags: vec!["finance".into(), "important".into()],
            password: "bank_pass789".into(),
        },
    ];

    // Encrypt all entries
    let mut encrypted_entries = Vec::new();
    for entry in &entries {
        let encrypted = encrypt_entry_logic(&state, entry).unwrap();
        encrypted_entries.push(encrypted);
    }

    // Decrypt and verify all entries
    for (i, encrypted) in encrypted_entries.iter().enumerate() {
        let decrypted = decrypt_entry_logic(&state, encrypted).unwrap();
        assert_eq!(decrypted.password, entries[i].password);
        assert_eq!(decrypted.website_url, entries[i].website_url);
        assert_eq!(decrypted.tags, entries[i].tags);
    }

    lock_vault_logic(&mut state);
}

#[test]
fn test_password_change_with_unlocked_vault() {
    let old_password = "old_pass";
    let new_password = "new_pass";
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();

    // Create a MEK
    let raw_mek = [0x42u8; 32];

    // Wrap MEK with old password
    let old_kek = derive_test_key(old_password, &salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&*old_kek).unwrap();
    let nonce = Nonce::from_slice(&[0u8; 12]);
    let ciphertext = cipher.encrypt(nonce, raw_mek.as_ref()).unwrap();
    let mut wrapped = Vec::new();
    wrapped.extend_from_slice(&[0u8; 12]);
    wrapped.extend_from_slice(&ciphertext);
    let wrapped_b64 = general_purpose::STANDARD.encode(wrapped);

    // Unlock vault with the MEK
    let mut state = VaultState::default();
    let mek_b64 = general_purpose::STANDARD.encode(raw_mek);
    unlock_vault_logic(&mut state, mek_b64).unwrap();

    // Create and encrypt an entry
    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "entry_password".into(),
    };
    let encrypted_entry = encrypt_entry_logic(&state, &entry).unwrap();

    // Change password
    let new_wrapped_b64 = change_password_optimization(
        wrapped_b64,
        old_password.into(),
        new_password.into(),
        salt_b64,
    )
    .unwrap();

    // Verify the entry can still be decrypted (MEK unchanged)
    let decrypted = decrypt_entry_logic(&state, &encrypted_entry).unwrap();
    assert_eq!(decrypted.password, entry.password);

    // Verify new password can unwrap the MEK
    let new_wrapped_bytes = general_purpose::STANDARD.decode(new_wrapped_b64).unwrap();
    let (new_nonce_bytes, new_ciphertext) = new_wrapped_bytes.split_at(12);
    let new_kek = derive_test_key(new_password, &salt_bytes);
    let new_cipher = Aes256Gcm::new_from_slice(&*new_kek).unwrap();
    let new_nonce = Nonce::from_slice(new_nonce_bytes);
    let unwrapped_mek = new_cipher.decrypt(new_nonce, new_ciphertext).unwrap();
    assert_eq!(unwrapped_mek, raw_mek);
}

#[test]
fn test_vault_unlock_encrypt_lock_unlock_decrypt() {
    let mut state = VaultState::default();
    let key = get_test_key_b64();

    // First session: unlock, encrypt, lock
    unlock_vault_logic(&mut state, key.clone()).unwrap();

    let entry = VaultEntry {
        folder_name: "Session Test".into(),
        website_url: "test.com".into(),
        tags: vec!["test".into()],
        password: "session_password".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    lock_vault_logic(&mut state);

    // Second session: unlock with same key, decrypt
    unlock_vault_logic(&mut state, key).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(decrypted.password, entry.password);
    assert_eq!(decrypted.folder_name, entry.folder_name);
}

#[test]
fn test_error_recovery_workflow() {
    let mut state = VaultState::default();

    // Try to encrypt without unlocking - should fail
    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "password".into(),
    };

    let result = encrypt_entry_logic(&state, &entry);
    assert!(result.is_err());

    // Now unlock and try again - should succeed
    unlock_vault_logic(&mut state, get_test_key_b64()).unwrap();
    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();

    // Lock and try to decrypt - should fail
    lock_vault_logic(&mut state);
    let result = decrypt_entry_logic(&state, &encrypted);
    assert!(result.is_err());

    // Unlock again and decrypt - should succeed
    unlock_vault_logic(&mut state, get_test_key_b64()).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();
    assert_eq!(decrypted.password, entry.password);
}

#[test]
fn test_key_rotation_simulation() {
    // Simulate rotating the vault key
    let mut state = VaultState::default();

    // Old key
    let old_key_bytes = vec![0xAAu8; 32];
    let old_key_b64 = general_purpose::STANDARD.encode(&old_key_bytes);

    // Unlock with old key
    unlock_vault_logic(&mut state, old_key_b64).unwrap();

    // Create and encrypt entry with old key
    let entry = VaultEntry {
        folder_name: "Rotation Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "test_password".into(),
    };
    let encrypted_with_old = encrypt_entry_logic(&state, &entry).unwrap();

    // Decrypt with old key to verify
    let decrypted = decrypt_entry_logic(&state, &encrypted_with_old).unwrap();
    assert_eq!(decrypted.password, entry.password);

    // Simulate key rotation: lock and unlock with new key
    lock_vault_logic(&mut state);

    let new_key_bytes = vec![0xBBu8; 32];
    let new_key_b64 = general_purpose::STANDARD.encode(&new_key_bytes);
    unlock_vault_logic(&mut state, new_key_b64).unwrap();

    // Old encrypted data cannot be decrypted with new key
    let result = decrypt_entry_logic(&state, &encrypted_with_old);
    assert!(result.is_err());

    // New data encrypted with new key
    let encrypted_with_new = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted_new = decrypt_entry_logic(&state, &encrypted_with_new).unwrap();
    assert_eq!(decrypted_new.password, entry.password);
}

#[test]
fn test_concurrent_operations_simulation() {
    // Simulate multiple operations in sequence
    let mut state = VaultState::default();
    unlock_vault_logic(&mut state, get_test_key_b64()).unwrap();

    // Rapid encrypt/decrypt cycles
    for i in 0..10 {
        let entry = VaultEntry {
            folder_name: format!("Folder{}", i),
            website_url: format!("site{}.com", i),
            tags: vec![format!("tag{}", i)],
            password: format!("password{}", i),
        };

        let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
        let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

        assert_eq!(decrypted.password, entry.password);
        assert_eq!(decrypted.folder_name, entry.folder_name);
    }

    lock_vault_logic(&mut state);
}

#[test]
fn test_large_scale_workflow() {
    let mut state = VaultState::default();
    unlock_vault_logic(&mut state, get_test_key_b64()).unwrap();

    // Create 100 entries
    let mut entries = Vec::new();
    let mut encrypted_entries = Vec::new();

    for i in 0..100 {
        let entry = VaultEntry {
            folder_name: format!("Folder{}", i),
            website_url: format!("https://site{}.com", i),
            tags: vec![format!("tag{}", i), "bulk".into()],
            password: format!("password_{}", i),
        };

        let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
        entries.push(entry);
        encrypted_entries.push(encrypted);
    }

    // Verify all entries can be decrypted
    for (i, encrypted) in encrypted_entries.iter().enumerate() {
        let decrypted = decrypt_entry_logic(&state, encrypted).unwrap();
        assert_eq!(decrypted.password, entries[i].password);
    }

    lock_vault_logic(&mut state);
}
