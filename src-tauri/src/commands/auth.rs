use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{
    password_hash::{PasswordHasher, Salt},
    Argon2,
};
use base64::{engine::general_purpose, Engine as _};
use rand_core::{OsRng, TryRngCore};
use zeroize::Zeroizing;

/// Changes the user's password by re-wrapping the Master Encryption Key (MEK).
///
/// # Efficiency and Security
///
/// This operation is **O(1)** relative to the vault size. Instead of re-encrypting every individual vault item
/// (which would be O(N)), we only re-encrypt the Key Encryption Key (KEK) that protects the MEK.
///
/// **Architecture:**
/// - **MEK (Master Encryption Key):** A random key that encrypts user data. This key *never* changes.
/// - **KEK (Key Encryption Key):** Derived from the user's password. This encrypts the MEK.
///
/// **Process:**
/// 1. Derive the **Old KEK** from the old password.
/// 2. Decrypt the **MEK** using the Old KEK.
/// 3. Derive the **New KEK** from the new password.
/// 4. Encrypt the **MEK** using the New KEK.
///
/// **Security Note:** The raw MEK is exposed in memory only briefly and is securely zeroed out immediately after use
/// via the `Zeroizing` wrapper. The actual vault data remains safely encrypted with the constant MEK.
#[tauri::command]
pub fn change_password_optimization(
    encrypted_mek_blob: String,
    old_password: String,
    new_password: String,
    salt: String,
) -> Result<String, String> {
    // Decode inputs
    let stored_wrapped_key_bytes = general_purpose::STANDARD
        .decode(encrypted_mek_blob)
        .map_err(|_| "Invalid base64 stored key")?;

    let salt_bytes = general_purpose::STANDARD
        .decode(salt)
        .map_err(|_| "Invalid base64 salt")?;

    // Helper function to derive a key from a password and salt using Argon2.
    fn derive_key(password: &str, salt_bytes: &[u8]) -> Result<Zeroizing<[u8; 32]>, String> {
        let mut output_key = Zeroizing::new([0u8; 32]);
        let argon2 = Argon2::default();

        // Prepare the salt string to satisfy API requirements.
        let salt_b64_string = general_purpose::STANDARD_NO_PAD.encode(salt_bytes);
        let salt = Salt::from_b64(&salt_b64_string).map_err(|e| format!("Invalid salt: {}", e))?;

        let hash = argon2
            .hash_password(password.as_bytes(), salt)
            .map_err(|e| format!("Argon2 error: {}", e))?;

        let hash_bytes = hash.hash.ok_or("No hash output")?;

        if hash_bytes.len() != 32 {
            return Err("Derived key length mismatch".into());
        }
        output_key.copy_from_slice(hash_bytes.as_bytes());

        Ok(output_key)
    }

    // 2. Derive the Key Encryption Key (KEK) from the old password.
    let old_kek = derive_key(&old_password, &salt_bytes)?;

    // 3. Decrypt the Master Encryption Key (MEK) using the old KEK.
    if stored_wrapped_key_bytes.len() < 12 {
        return Err("Stored wrapped key is too short".into());
    }
    let (nonce_bytes, ciphertext) = stored_wrapped_key_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher_old =
        Aes256Gcm::new_from_slice(&*old_kek).map_err(|_| "Failed to init cipher with old KEK")?;

    // This is the Raw MEK
    let raw_mek = Zeroizing::new(
        cipher_old
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Failed to decrypt MEK with old password")?,
    );

    // 4. Derive the new KEK from the new password.
    let new_kek = crypto::derive_kek(&new_password, &salt_bytes)?;

    // 5. Encrypt the raw MEK with the new KEK.
    let cipher_new =
        Aes256Gcm::new_from_slice(&*new_kek).map_err(|_| "Failed to init cipher with new KEK")?;

    let mut new_nonce_bytes = [0u8; 12];
    OsRng
        .try_fill_bytes(&mut new_nonce_bytes)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    let new_nonce = Nonce::from_slice(&new_nonce_bytes);

    let new_ciphertext = cipher_new
        .encrypt(new_nonce, raw_mek.as_slice())
        .map_err(|_| "Failed to encrypt MEK with new password")?;

    // 6. Concatenate the new nonce and ciphertext to form the final result.
    let mut out = Vec::new();
    out.extend_from_slice(&new_nonce_bytes);
    out.extend_from_slice(&new_ciphertext);

    Ok(general_purpose::STANDARD.encode(out))
}
