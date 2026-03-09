use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use rand_core::{OsRng, TryRngCore};
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;
use zeroize::Zeroizing;

use crate::crypto;
use crate::state::VaultState;

#[derive(Serialize)]
pub struct RegisterResponse {
    pub salt: String,
    pub wrapped_mek: String,
    pub auth_hash: String,
    pub recovery_key: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub auth_hash: String,
}

/// Core logic for registering a vault.
/// Separated for testing.
pub fn register_vault_logic(password: String) -> Result<(RegisterResponse, Vec<u8>), String> {
    // 1. Generate new random Salt
    let salt = crypto::generate_salt()?;

    // 2. Generate new random MEK
    let mek = crypto::generate_mek()?;

    // 3. Derive KEK from password + salt
    let kek = crypto::derive_kek(&password, &salt)?;

    // 4. Derive AuthKey and EncKey from KEK using BLAKE3
    let (auth_key, enc_key) = crypto::derive_keys_from_kek(&*kek);

    // 5. Wrap (Encrypt) MEK with EncKey (NOT KEK directly)
    let cipher = Aes256Gcm::new_from_slice(&*enc_key).map_err(|_| "Failed to create cipher")?;
    let mut nonce_bytes = [0u8; 12];
    OsRng
        .try_fill_bytes(&mut nonce_bytes)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let encrypted_mek = cipher
        .encrypt(nonce, mek.as_slice())
        .map_err(|_| "Failed to encrypt MEK")?;

    // Combine Nonce + Ciphertext for storage
    let mut wrapped_mek_bytes = Vec::new();
    wrapped_mek_bytes.extend_from_slice(&nonce_bytes);
    wrapped_mek_bytes.extend_from_slice(&encrypted_mek);

    // Auth Hash is now the hex-encoded AuthKey
    let auth_hash = hex::encode(*auth_key);

    Ok((
        RegisterResponse {
            salt: general_purpose::STANDARD.encode(salt),
            wrapped_mek: general_purpose::STANDARD.encode(&wrapped_mek_bytes),
            auth_hash,
            recovery_key: general_purpose::STANDARD.encode(&*mek),
        },
        mek.to_vec(),
    ))
}

/// Registers a new vault by generating fresh keys.
/// Returns the Salt, Wrapped MEK, and AuthHash to be sent to the server.
#[tauri::command]
pub fn register_vault(
    state: State<'_, Mutex<VaultState>>,
    password: String,
) -> Result<RegisterResponse, String> {
    let (response, mek) = register_vault_logic(password)?;

    // 6. Store MEK in State (Unlock the vault immediately)
    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;
    let mut stored_mek = Zeroizing::new([0u8; 32]);
    stored_mek.copy_from_slice(&mek);
    st.enc_key = Some(stored_mek.to_vec());
    st.unlocked = true;

    Ok(response)
}

/// Core logic for logging in.
/// Separated for testing.
pub fn login_vault_logic(
    password: String,
    salt: String,
    wrapped_mek: String,
) -> Result<(LoginResponse, Vec<u8>), String> {
    // 1. Decode inputs
    let salt_bytes = general_purpose::STANDARD
        .decode(salt)
        .map_err(|_| "Invalid salt base64")?;
    let wrapped_mek_bytes = general_purpose::STANDARD
        .decode(wrapped_mek)
        .map_err(|_| "Invalid wrapped_mek base64")?;

    // 2. Derive KEK
    let kek = crypto::derive_kek(&password, &salt_bytes)?;

    // 3. Derive AuthKey and EncKey
    let (auth_key, enc_key) = crypto::derive_keys_from_kek(&*kek);

    // 4. Unwrap MEK using EncKey
    if wrapped_mek_bytes.len() < 12 {
        return Err("Wrapped MEK too short".into());
    }
    let (nonce_bytes, ciphertext) = wrapped_mek_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(&*enc_key).map_err(|_| "Failed to init cipher")?;

    let mek_vec = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Invalid password or corrupted vault")?;

    if mek_vec.len() != 32 {
        return Err("Invalid MEK length".into());
    }

    // 5. Return AuthHash (hex-encoded AuthKey)
    let auth_hash = hex::encode(*auth_key);

    Ok((LoginResponse { auth_hash }, mek_vec))
}

/// Logs in by deriving keys and unwrapping the MEK.
/// Returns AuthHash for server verification.
#[tauri::command]
pub fn login_vault(
    state: State<'_, Mutex<VaultState>>,
    password: String,
    salt: String,
    wrapped_mek: String,
) -> Result<LoginResponse, String> {
    let (response, mek_vec) = login_vault_logic(password, salt, wrapped_mek)?;

    // 4. Store MEK in State
    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;
    let mut stored_mek = Zeroizing::new([0u8; 32]);
    stored_mek.copy_from_slice(&mek_vec);
    st.enc_key = Some(stored_mek.to_vec());
    st.unlocked = true;

    Ok(response)
}

/// Core logic for changing password.
pub fn change_password_optimization_logic(
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

    // 2. Derive Old KEK -> EncKey
    let old_kek = crypto::derive_kek(&old_password, &salt_bytes)?;
    let (_, old_enc_key) = crypto::derive_keys_from_kek(&*old_kek);

    // 3. Decrypt the Master Encryption Key (MEK) using the Old EncKey
    if stored_wrapped_key_bytes.len() < 12 {
        return Err("Stored wrapped key is too short".into());
    }
    let (nonce_bytes, ciphertext) = stored_wrapped_key_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher_old = Aes256Gcm::new_from_slice(&*old_enc_key)
        .map_err(|_| "Failed to init cipher with old EncKey")?;

    // This is the Raw MEK
    let raw_mek = Zeroizing::new(
        cipher_old
            .decrypt(nonce, ciphertext)
            .map_err(|_| "Failed to decrypt MEK with old password")?,
    );

    // 4. Derive New KEK -> EncKey
    let new_kek = crypto::derive_kek(&new_password, &salt_bytes)?;
    let (_, new_enc_key) = crypto::derive_keys_from_kek(&*new_kek);

    // 5. Encrypt the raw MEK with the New EncKey.
    let cipher_new = Aes256Gcm::new_from_slice(&*new_enc_key)
        .map_err(|_| "Failed to init cipher with new EncKey")?;

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

/// Changes the user's password by re-wrapping the Master Encryption Key (MEK).
#[tauri::command]
pub fn change_password_optimization(
    encrypted_mek_blob: String,
    old_password: String,
    new_password: String,
    salt: String,
) -> Result<String, String> {
    change_password_optimization_logic(encrypted_mek_blob, old_password, new_password, salt)
}
