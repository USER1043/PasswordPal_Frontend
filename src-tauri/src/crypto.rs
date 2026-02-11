use rand_core::{OsRng, TryRngCore};
use argon2::{
    password_hash::{PasswordHasher, Salt},
    Argon2,
};
use zeroize::Zeroizing;
use base64::{engine::general_purpose, Engine as _};

/// Generates a random 32-byte Master Encryption Key (MEK)
pub fn generate_mek() -> Result<Zeroizing<[u8; 32]>, String> {
    let mut mek = Zeroizing::new([0u8; 32]);
    OsRng.try_fill_bytes(&mut *mek)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    Ok(mek)
}

/// Generates a random 16-byte Salt
pub fn generate_salt() -> Result<[u8; 16], String> {
    let mut salt = [0u8; 16];
    OsRng.try_fill_bytes(&mut salt)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    Ok(salt)
}

/// Derives the Key Encryption Key (KEK) from password and salt using Argon2id.
/// 
/// Params:
/// - password: User's master password
/// - salt: User's unique salt (raw bytes)
/// 
/// Returns:
/// - Zeroizing<[u8; 32]>: The 32-byte derived KEK, protected from memory dumps.
pub fn derive_kek(password: &str, salt_bytes: &[u8]) -> Result<Zeroizing<[u8; 32]>, String> {
    let mut output_key = Zeroizing::new([0u8; 32]);
    let argon2 = Argon2::default();
    
    // Prepare the salt string to satisfy API requirements.
    let salt_b64_string = general_purpose::STANDARD_NO_PAD.encode(salt_bytes);
    let salt = Salt::from_b64(&salt_b64_string)
       .map_err(|e| format!("Invalid salt: {}", e))?;

    let hash = argon2.hash_password(password.as_bytes(), salt)
        .map_err(|e| format!("Argon2 error: {}", e))?;
        
    let hash_bytes = hash.hash.ok_or("No hash output")?;
    
    if hash_bytes.len() != 32 {
        return Err("Derived key length mismatch".into());
    }
    output_key.copy_from_slice(hash_bytes.as_bytes());
    
    Ok(output_key)
}

/// Derives two separate keys from the KEK using BLAKE3 Key Derivation
/// - AuthKey: For server authentication
/// - EncKey: For wrapping/unwrapping the MEK
pub fn derive_keys_from_kek(kek: &[u8]) -> (Zeroizing<[u8; 32]>, Zeroizing<[u8; 32]>) {
    let mut auth_key = Zeroizing::new([0u8; 32]);
    let mut enc_key = Zeroizing::new([0u8; 32]);

    // Derive Auth Key
    let derived_auth = blake3::derive_key("passwordpal_auth_v1", kek);
    auth_key.copy_from_slice(&derived_auth);

    // Derive Enc Key
    let derived_enc = blake3::derive_key("passwordpal_enc_v1", kek);
    enc_key.copy_from_slice(&derived_enc);

    (auth_key, enc_key)
}
