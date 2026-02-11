// Integration tests for entry encryption/decryption

mod common;

use common::get_test_key;
use passwordpal_lib::commands::entry::{decrypt_entry_logic, encrypt_entry_logic};
use passwordpal_lib::models::VaultEntry;
use passwordpal_lib::state::VaultState;

// ============================================================================
// TESTS CASES
// ============================================================================

#[test]
fn test_encrypt_decrypt_flow() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec!["tag1".into()],
        password: "secret".into(),
    };

    // Encrypt
    let enc_result = encrypt_entry_logic(&state, &entry);
    assert!(enc_result.is_ok());
    let encrypted_blob = enc_result.unwrap();

    // Decrypt
    let dec_result = decrypt_entry_logic(&state, &encrypted_blob);
    assert!(dec_result.is_ok());
    let decrypted_entry = dec_result.unwrap();

    // Verify equality
    assert_eq!(entry.password, decrypted_entry.password);
    assert_eq!(entry.website_url, decrypted_entry.website_url);
}

#[test]
fn test_encrypt_fail_when_locked() {
    let state = VaultState::default(); // Locked by default
    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "secret".into(),
    };

    let result = encrypt_entry_logic(&state, &entry);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "Vault is locked");
}

#[test]
fn test_decrypt_fail_tampered_data() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    // Valid data encryption
    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "secret".into(),
    };
    let blob = encrypt_entry_logic(&state, &entry).unwrap();

    // Tamper with the base64 string (change last char)
    let mut tampered_blob = blob.clone();
    tampered_blob.pop();
    tampered_blob.push('A'); // Just changing a char to corrupt it

    let result = decrypt_entry_logic(&state, &tampered_blob);

    // It should fail either at base64 decode or GCM decryption (tag verification)
    assert!(result.is_err());
}

#[test]
fn test_decrypt_fail_when_locked() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "secret".into(),
    };

    // Encrypt while unlocked
    let blob = encrypt_entry_logic(&state, &entry).unwrap();

    // Lock the vault
    state.unlocked = false;
    state.enc_key = None;

    // Try to decrypt while locked
    let result = decrypt_entry_logic(&state, &blob);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "Vault is locked");
}

#[test]
fn test_encrypt_entry_with_unicode_characters() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "日本語フォルダ".into(),
        website_url: "例え.com".into(),
        tags: vec!["タグ1".into(), "🔐".into()],
        password: "パスワード123!@#".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.folder_name, decrypted.folder_name);
    assert_eq!(entry.website_url, decrypted.website_url);
    assert_eq!(entry.tags, decrypted.tags);
    assert_eq!(entry.password, decrypted.password);
}

#[test]
fn test_encrypt_entry_with_special_characters() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "Test!@#$%^&*()".into(),
        website_url: "https://example.com/path?query=value&foo=bar".into(),
        tags: vec!["<script>".into(), "'; DROP TABLE--".into()],
        password: "p@$$w0rd!#$%&*+,-./:;<=>?@[]^_`{|}~".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.password, decrypted.password);
    assert_eq!(entry.website_url, decrypted.website_url);
}

#[test]
fn test_encrypt_entry_with_empty_fields() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "".into(),
        website_url: "".into(),
        tags: vec![],
        password: "".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.folder_name, decrypted.folder_name);
    assert_eq!(entry.password, decrypted.password);
}

#[test]
fn test_encrypt_large_entry() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    // Create entry with large data
    let large_password = "a".repeat(10000);
    let many_tags: Vec<String> = (0..100).map(|i| format!("tag{}", i)).collect();

    let entry = VaultEntry {
        folder_name: "Large Entry".into(),
        website_url: "example.com".into(),
        tags: many_tags.clone(),
        password: large_password.clone(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(decrypted.password.len(), 10000);
    assert_eq!(decrypted.tags.len(), 100);
    assert_eq!(decrypted.password, large_password);
    assert_eq!(decrypted.tags, many_tags);
}

#[test]
fn test_encrypt_multiple_entries_sequentially() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entries = vec![
        VaultEntry {
            folder_name: "Entry1".into(),
            website_url: "site1.com".into(),
            tags: vec!["tag1".into()],
            password: "pass1".into(),
        },
        VaultEntry {
            folder_name: "Entry2".into(),
            website_url: "site2.com".into(),
            tags: vec!["tag2".into()],
            password: "pass2".into(),
        },
        VaultEntry {
            folder_name: "Entry3".into(),
            website_url: "site3.com".into(),
            tags: vec!["tag3".into()],
            password: "pass3".into(),
        },
    ];

    let mut encrypted_blobs = Vec::new();

    // Encrypt all entries
    for entry in &entries {
        let encrypted = encrypt_entry_logic(&state, entry).unwrap();
        encrypted_blobs.push(encrypted);
    }

    // Decrypt all entries and verify
    for (i, blob) in encrypted_blobs.iter().enumerate() {
        let decrypted = decrypt_entry_logic(&state, blob).unwrap();
        assert_eq!(decrypted.password, entries[i].password);
        assert_eq!(decrypted.website_url, entries[i].website_url);
    }
}

#[test]
fn test_decrypt_with_wrong_key() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: "example.com".into(),
        tags: vec![],
        password: "secret".into(),
    };

    // Encrypt with first key
    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();

    // Change to different key
    state.enc_key = Some(vec![0xFFu8; 32]);

    // Try to decrypt with wrong key
    let result = decrypt_entry_logic(&state, &encrypted);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to decrypt"));
}

#[test]
fn test_decrypt_invalid_base64() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let result = decrypt_entry_logic(&state, "!!!invalid_base64!!!");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid base64 encrypted blob");
}

#[test]
fn test_decrypt_blob_too_short() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    // Create a valid base64 string but too short (less than 12 bytes)
    use base64::{engine::general_purpose, Engine as _};
    let short_blob = general_purpose::STANDARD.encode(b"short");

    let result = decrypt_entry_logic(&state, &short_blob);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Encrypted Blob is too short");
}

#[test]
fn test_encrypt_entry_with_very_long_url() {
    let mut state = VaultState::default();
    state.unlocked = true;
    state.enc_key = Some(get_test_key());

    let long_url = format!("https://example.com/{}", "a".repeat(5000));

    let entry = VaultEntry {
        folder_name: "Test".into(),
        website_url: long_url.clone(),
        tags: vec![],
        password: "secret".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(decrypted.website_url, long_url);
}
