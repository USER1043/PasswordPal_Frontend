// Integration tests for authentication module

mod common;

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use zeroize::Zeroizing;
use common::{derive_test_key, get_test_salt, get_test_salt_b64};
use passwordpal_lib::commands::auth::{
    change_password_optimization, login_vault_logic, register_vault_logic,
};

/// Helper to create a wrapped MEK with a given password
fn create_wrapped_mek(password: &str, salt_bytes: &[u8], raw_mek: &[u8; 32]) -> String {
    // 1. Derive KEK
    let kek = derive_test_key(password, salt_bytes);
    
    // 2. Derive EncKey from KEK (BLAKE3)
    let mut enc_key = Zeroizing::new([0u8; 32]);
    let derived_enc = blake3::derive_key("passwordpal_enc_v1", &*kek);
    enc_key.copy_from_slice(&derived_enc);

    // 3. Encrypt MEK with EncKey
    let cipher = Aes256Gcm::new_from_slice(&*enc_key).unwrap();
    let nonce = Nonce::from_slice(&[0u8; 12]);
    let ciphertext = cipher.encrypt(nonce, raw_mek.as_ref()).unwrap();

    let mut wrapped = Vec::new();
    wrapped.extend_from_slice(&[0u8; 12]);
    wrapped.extend_from_slice(&ciphertext);
    general_purpose::STANDARD.encode(wrapped)
}

// ============================================================================
// TEST CASES
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
    
    // Derive EncKey
    let mut new_enc_key = Zeroizing::new([0u8; 32]);
    let derived_enc = blake3::derive_key("passwordpal_enc_v1", &*new_kek);
    new_enc_key.copy_from_slice(&derived_enc);

    let new_cipher = Aes256Gcm::new_from_slice(&*new_enc_key).unwrap();
    let new_nonce = Nonce::from_slice(new_nonce_bytes);

    let decrypted_mek = new_cipher
        .decrypt(new_nonce, new_ciphertext)
        .expect("Should decrypt with new password");

    assert_eq!(decrypted_mek, raw_mek);
}

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
    
    // Derive EncKey
    let mut enc_key3 = Zeroizing::new([0u8; 32]);
    let derived_enc = blake3::derive_key("passwordpal_enc_v1", &*kek3);
    enc_key3.copy_from_slice(&derived_enc);
    
    let cipher = Aes256Gcm::new_from_slice(&*enc_key3).unwrap();
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
    
    // Derive EncKey
    let mut new_enc_key = Zeroizing::new([0u8; 32]);
    let derived_enc = blake3::derive_key("passwordpal_enc_v1", &*new_kek);
    new_enc_key.copy_from_slice(&derived_enc);

    let cipher = Aes256Gcm::new_from_slice(&*new_enc_key).unwrap();
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

#[test]
fn test_register_vault_success() {
    let password = "my_secret_password";
    let result = register_vault_logic(password.to_string());
    
    assert!(result.is_ok());
    let (response, mek) = result.unwrap();
    
    // Check response fields
    assert_eq!(response.salt.len(), 24); // Base64 of 16 bytes is 24 chars
    assert!(response.wrapped_mek.len() > 32); // 12 nonce + 32 ciphertext + 16 tag = ~60 bytes -> ~80 base64 chars
    assert_eq!(response.auth_hash.len(), 64); // SHA-256 hex is 64 chars
    
    // Check MEK
    assert_eq!(mek.len(), 32);
}

#[test]
fn test_login_vault_success() {
    let password = "login_password";
    
    // 1. Register first to get valid data
    let register_result = register_vault_logic(password.to_string()).unwrap();
    let (reg_response, original_mek) = register_result;
    
    // 2. Login with correct credentials
    let login_result = login_vault_logic(
        password.to_string(),
        reg_response.salt.clone(),
        reg_response.wrapped_mek.clone(),
    );
    
    assert!(login_result.is_ok());
    let (login_response, decrypted_mek) = login_result.unwrap();
    
    // 3. Verify MEK matches
    assert_eq!(decrypted_mek, original_mek);
    
    // 4. Verify Auth Hash matches
    assert_eq!(login_response.auth_hash, reg_response.auth_hash);
}

#[test]
fn test_login_vault_failure_wrong_password() {
    let password = "correct_password";
    let wrong_password = "wrong_password";
    
    // 1. Register
    let (reg_response, _) = register_vault_logic(password.to_string()).unwrap();
    
    // 2. Login with wrong password
    let login_result = login_vault_logic(
        wrong_password.to_string(),
        reg_response.salt,
        reg_response.wrapped_mek,
    );
    
    assert!(login_result.is_err());
}

