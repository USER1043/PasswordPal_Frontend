// Integration tests for authentication module
// Tests moved from src/commands/auth.rs and additional test cases

mod common;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use common::{derive_test_key, get_test_salt, get_test_salt_b64};
use passwordpal_lib::commands::auth::change_password_optimization;

/// Helper to create a wrapped MEK with a given password
fn create_wrapped_mek(password: &str, salt_bytes: &[u8], raw_mek: &[u8; 32]) -> String {
    let kek = derive_test_key(password, salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&*kek).unwrap();
    let nonce = Nonce::from_slice(&[0u8; 12]);
    let ciphertext = cipher.encrypt(nonce, raw_mek.as_ref()).unwrap();

    let mut wrapped = Vec::new();
    wrapped.extend_from_slice(&[0u8; 12]);
    wrapped.extend_from_slice(&ciphertext);
    general_purpose::STANDARD.encode(wrapped)
}

// ============================================================================
// EXISTING TESTS (moved from auth.rs)
// ============================================================================

#[test]
fn test_change_password_success() {
    let old_password = "old_password";
    let new_password = "new_password";
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();

    // 1. Create a Fake MEK (32 bytes)
    let raw_mek = [0x55u8; 32];

    // 2. Wrap it with OLD password
    let wrapped_b64 = create_wrapped_mek(old_password, &salt_bytes, &raw_mek);

    // 3. Call Function
    let result = change_password_optimization(
        wrapped_b64,
        old_password.into(),
        new_password.into(),
        salt_b64.clone(),
    );

    assert!(result.is_ok());
    let new_wrapped_b64 = result.unwrap();

    // 4. Verify we can decrypt it with NEW password
    let new_wrapped_bytes = general_purpose::STANDARD.decode(new_wrapped_b64).unwrap();
    let (new_nonce_bytes, new_ciphertext) = new_wrapped_bytes.split_at(12);

    let new_kek = derive_test_key(new_password, &salt_bytes);
    let new_cipher = Aes256Gcm::new_from_slice(&*new_kek).unwrap();
    let new_nonce = Nonce::from_slice(new_nonce_bytes);

    let decrypted_mek = new_cipher
        .decrypt(new_nonce, new_ciphertext)
        .expect("Should decrypt with new password");

    assert_eq!(decrypted_mek, raw_mek);
}

// ============================================================================
// NEW TESTS (additional coverage)
// ============================================================================

#[test]
fn test_change_password_invalid_old_password() {
    let old_password = "old_password";
    let wrong_password = "wrong_password";
    let new_password = "new_password";
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();
    let raw_mek = [0x55u8; 32];

    // Wrap with old password
    let wrapped_b64 = create_wrapped_mek(old_password, &salt_bytes, &raw_mek);

    // Try to change with wrong old password
    let result = change_password_optimization(
        wrapped_b64,
        wrong_password.into(),
        new_password.into(),
        salt_b64,
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Failed to decrypt MEK"));
}

#[test]
fn test_change_password_invalid_base64_blob() {
    let result = change_password_optimization(
        "!!!invalid_base64!!!".into(),
        "old_password".into(),
        "new_password".into(),
        get_test_salt_b64(),
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid base64 stored key");
}

#[test]
fn test_change_password_invalid_salt() {
    let old_password = "old_password";
    let new_password = "new_password";
    let salt_bytes = get_test_salt();
    let raw_mek = [0x55u8; 32];

    let wrapped_b64 = create_wrapped_mek(old_password, &salt_bytes, &raw_mek);

    let result = change_password_optimization(
        wrapped_b64,
        old_password.into(),
        new_password.into(),
        "!!!invalid_salt!!!".into(),
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid base64 salt");
}

#[test]
fn test_change_password_blob_too_short() {
    // Create a blob that's too short (less than 12 bytes)
    let short_blob = general_purpose::STANDARD.encode(b"short");

    let result = change_password_optimization(
        short_blob,
        "old_password".into(),
        "new_password".into(),
        get_test_salt_b64(),
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Stored wrapped key is too short");
}

#[test]
fn test_change_password_multiple_times() {
    let password1 = "password1";
    let password2 = "password2";
    let password3 = "password3";
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();
    let raw_mek = [0xAAu8; 32];

    // First wrap
    let wrapped1 = create_wrapped_mek(password1, &salt_bytes, &raw_mek);

    // Change to password2
    let result2 = change_password_optimization(
        wrapped1,
        password1.into(),
        password2.into(),
        salt_b64.clone(),
    );
    assert!(result2.is_ok());
    let wrapped2 = result2.unwrap();

    // Change to password3
    let result3 = change_password_optimization(
        wrapped2,
        password2.into(),
        password3.into(),
        salt_b64.clone(),
    );
    assert!(result3.is_ok());
    let wrapped3 = result3.unwrap();

    // Verify we can decrypt with password3
    let wrapped_bytes = general_purpose::STANDARD.decode(wrapped3).unwrap();
    let (nonce_bytes, ciphertext) = wrapped_bytes.split_at(12);
    let kek3 = derive_test_key(password3, &salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&*kek3).unwrap();
    let nonce = Nonce::from_slice(nonce_bytes);
    let decrypted = cipher.decrypt(nonce, ciphertext).unwrap();

    assert_eq!(decrypted, raw_mek);
}

#[test]
fn test_change_password_with_special_characters() {
    let old_password = "p@ssw0rd!#$%";
    let new_password = "新しいパスワード🔐";
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();
    let raw_mek = [0xBBu8; 32];

    let wrapped_b64 = create_wrapped_mek(old_password, &salt_bytes, &raw_mek);

    let result = change_password_optimization(
        wrapped_b64,
        old_password.into(),
        new_password.into(),
        salt_b64.clone(),
    );

    assert!(result.is_ok());

    // Verify decryption with new password
    let new_wrapped_bytes = general_purpose::STANDARD.decode(result.unwrap()).unwrap();
    let (nonce_bytes, ciphertext) = new_wrapped_bytes.split_at(12);
    let new_kek = derive_test_key(new_password, &salt_bytes);
    let cipher = Aes256Gcm::new_from_slice(&*new_kek).unwrap();
    let nonce = Nonce::from_slice(nonce_bytes);
    let decrypted = cipher.decrypt(nonce, ciphertext).unwrap();

    assert_eq!(decrypted, raw_mek);
}

#[test]
fn test_change_password_empty_passwords() {
    let salt_bytes = get_test_salt();
    let salt_b64 = get_test_salt_b64();
    let raw_mek = [0xCCu8; 32];

    // Empty old password
    let wrapped_b64 = create_wrapped_mek("", &salt_bytes, &raw_mek);

    let result =
        change_password_optimization(wrapped_b64, "".into(), "new_password".into(), salt_b64);

    // Should succeed - empty passwords are technically valid
    assert!(result.is_ok());
}
