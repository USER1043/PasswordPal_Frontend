// Common test utilities and helpers for integration tests
#![allow(dead_code)]

use base64::{engine::general_purpose, Engine as _};
use zeroize::Zeroizing;
use argon2::{
    password_hash::{PasswordHasher, Salt},
    Argon2,
};

/// Creates a test encryption key (32 bytes of zeros)
pub fn get_test_key() -> Vec<u8> {
    vec![0u8; 32]
}

/// Creates a test encryption key as base64
pub fn get_test_key_b64() -> String {
    general_purpose::STANDARD.encode(get_test_key())
}

/// Derives a key from a password and salt using Argon2 (for testing)
pub fn derive_test_key(password: &str, salt: &[u8]) -> Zeroizing<[u8; 32]> {
    let mut output_key = Zeroizing::new([0u8; 32]);
    let argon2 = Argon2::default();
    let salt_b64 = general_purpose::STANDARD_NO_PAD.encode(salt);
    let s = Salt::from_b64(&salt_b64).unwrap();
    let hash = argon2.hash_password(password.as_bytes(), s).unwrap();
    output_key.copy_from_slice(hash.hash.unwrap().as_bytes());
    output_key
}

/// Creates a test salt (16 bytes)
pub fn get_test_salt() -> Vec<u8> {
    b"random_salt_1234".to_vec()
}

/// Creates a test salt as base64
pub fn get_test_salt_b64() -> String {
    general_purpose::STANDARD.encode(get_test_salt())
}
