// Integration tests for entry encryption/decryption

mod common;

use common::get_test_key;
use passwordpal_lib::commands::entry::{decrypt_entry_logic, encrypt_entry_logic};
use passwordpal_lib::models::VaultEntry;
use passwordpal_lib::state::VaultState;

// Helper to create a test VaultEntry with required fields
fn test_entry(folder: &str, url: &str, tags: Vec<&str>, pwd: &str) -> VaultEntry {
    VaultEntry {
        name: format!("Test {}", folder),
        username: "testuser@example.com".into(),
        folder_name: folder.into(),
        website_url: url.into(),
        tags: tags.into_iter().map(|s| s.to_string()).collect(),
        password: pwd.into(),
        notes: "".into(),
    }
}

#[test]
fn test_encrypt_decrypt_flow() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = test_entry("Test", "example.com", vec!["tag1"], "secret");

    let enc_result = encrypt_entry_logic(&state, &entry);
    assert!(enc_result.is_ok());
    let encrypted_blob = enc_result.unwrap();

    let dec_result = decrypt_entry_logic(&state, &encrypted_blob);
    assert!(dec_result.is_ok());
    let decrypted_entry = dec_result.unwrap();

    assert_eq!(entry.password, decrypted_entry.password);
    assert_eq!(entry.website_url, decrypted_entry.website_url);
    assert_eq!(entry.name, decrypted_entry.name);
    assert_eq!(entry.username, decrypted_entry.username);
    assert_eq!(entry.notes, decrypted_entry.notes);
}

#[test]
fn test_encrypt_fail_when_locked() {
    let state = VaultState::default();
    let entry = test_entry("Test", "example.com", vec![], "secret");

    let result = encrypt_entry_logic(&state, &entry);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "Vault is locked");
}

#[test]
fn test_decrypt_fail_tampered_data() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = test_entry("Test", "example.com", vec![], "secret");
    let blob = encrypt_entry_logic(&state, &entry).unwrap();

    let mut tampered_blob = blob.clone();
    tampered_blob.pop();
    tampered_blob.push('A');

    let result = decrypt_entry_logic(&state, &tampered_blob);
    assert!(result.is_err());
}

#[test]
fn test_decrypt_fail_when_locked() {
    let mut state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = test_entry("Test", "example.com", vec![], "secret");
    let blob = encrypt_entry_logic(&state, &entry).unwrap();

    state.unlocked = false;
    state.enc_key = None;

    let result = decrypt_entry_logic(&state, &blob);
    assert!(result.is_err());
    assert_eq!(result.err().unwrap(), "Vault is locked");
}

#[test]
fn test_encrypt_entry_with_unicode_characters() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = VaultEntry {
        name: "日本語アカウント".into(),
        username: "ユーザー@例え.com".into(),
        folder_name: "日本語フォルダ".into(),
        website_url: "例え.com".into(),
        tags: vec!["タグ1".into(), "🔐".into()],
        password: "パスワード123!@#".into(),
        notes: "テストノート".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.folder_name, decrypted.folder_name);
    assert_eq!(entry.website_url, decrypted.website_url);
    assert_eq!(entry.tags, decrypted.tags);
    assert_eq!(entry.password, decrypted.password);
    assert_eq!(entry.name, decrypted.name);
    assert_eq!(entry.username, decrypted.username);
}

#[test]
fn test_encrypt_entry_with_special_characters() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = VaultEntry {
        name: "Special!@#".into(),
        username: "user<script>".into(),
        folder_name: "Test!@#$%^&*()".into(),
        website_url: "https://example.com/path?query=value&foo=bar".into(),
        tags: vec!["<script>".into(), "'; DROP TABLE--".into()],
        password: "p@$$w0rd!#$%&*+,-./:;<=>?@[]^_`{|}~".into(),
        notes: "Notes with \"quotes\" and 'apostrophes'".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.password, decrypted.password);
    assert_eq!(entry.website_url, decrypted.website_url);
}

#[test]
fn test_encrypt_entry_with_empty_fields() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = VaultEntry {
        name: "".into(),
        username: "".into(),
        folder_name: "".into(),
        website_url: "".into(),
        tags: vec![],
        password: "".into(),
        notes: "".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(entry.folder_name, decrypted.folder_name);
    assert_eq!(entry.password, decrypted.password);
}

#[test]
fn test_encrypt_large_entry() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let large_password = "a".repeat(10000);
    let many_tags: Vec<String> = (0..100).map(|i| format!("tag{}", i)).collect();

    let entry = VaultEntry {
        name: "Large Entry".into(),
        username: "largeuser@test.com".into(),
        folder_name: "Large Entry".into(),
        website_url: "example.com".into(),
        tags: many_tags.clone(),
        password: large_password.clone(),
        notes: "x".repeat(5000),
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
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entries = vec![
        test_entry("Entry1", "site1.com", vec!["tag1"], "pass1"),
        test_entry("Entry2", "site2.com", vec!["tag2"], "pass2"),
        test_entry("Entry3", "site3.com", vec!["tag3"], "pass3"),
    ];

    let mut encrypted_blobs = Vec::new();

    for entry in &entries {
        let encrypted = encrypt_entry_logic(&state, entry).unwrap();
        encrypted_blobs.push(encrypted);
    }

    for (i, blob) in encrypted_blobs.iter().enumerate() {
        let decrypted = decrypt_entry_logic(&state, blob).unwrap();
        assert_eq!(decrypted.password, entries[i].password);
        assert_eq!(decrypted.website_url, entries[i].website_url);
    }
}

#[test]
fn test_decrypt_with_wrong_key() {
    let mut state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let entry = test_entry("Test", "example.com", vec![], "secret");
    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();

    state.enc_key = Some(vec![0xFFu8; 32]);

    let result = decrypt_entry_logic(&state, &encrypted);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to decrypt"));
}

#[test]
fn test_decrypt_invalid_base64() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let result = decrypt_entry_logic(&state, "!!!invalid_base64!!!");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid base64 encrypted blob");
}

#[test]
fn test_decrypt_blob_too_short() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    use base64::{engine::general_purpose, Engine as _};
    let short_blob = general_purpose::STANDARD.encode(b"short");

    let result = decrypt_entry_logic(&state, &short_blob);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Encrypted Blob is too short");
}

#[test]
fn test_encrypt_entry_with_very_long_url() {
    let state = VaultState {
        unlocked: true,
        enc_key: Some(get_test_key()),
    };

    let long_url = format!("https://example.com/{}", "a".repeat(5000));

    let entry = VaultEntry {
        name: "Long URL Test".into(),
        username: "urltest@test.com".into(),
        folder_name: "Test".into(),
        website_url: long_url.clone(),
        tags: vec![],
        password: "secret".into(),
        notes: "".into(),
    };

    let encrypted = encrypt_entry_logic(&state, &entry).unwrap();
    let decrypted = decrypt_entry_logic(&state, &encrypted).unwrap();

    assert_eq!(decrypted.website_url, long_url);
}
