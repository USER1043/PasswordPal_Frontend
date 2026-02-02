// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(VaultState::default()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            encrypt_entry,
            decrypt_entry,
            unlock_vault,
            lock_vault,
            change_password_optimization
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::sync::Mutex;

use aes_gcm::{
  aead::{Aead, KeyInit},
  Aes256Gcm, Nonce
};

use base64::{engine::general_purpose, Engine as _};
use rand_core::{OsRng, TryRngCore};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;
use tauri::State;

/// Manages the vault's runtime state, securely holding the encryption key when unlocked.
#[derive(Default)]
pub struct VaultState {
    pub unlocked: bool,
    pub enc_key: Option<Vec<u8>>,
}
impl VaultState{
    pub fn lock_and_wipe(&mut self){
        if let Some(mut k) = self.enc_key.take(){
            k.zeroize();
        }
        self.unlocked= false;
    }
}

/// Unlocks the vault with the provided Base64-encoded key.
///
/// This function decodes the key, validates its length, and securely stores it in the application state.
#[tauri::command]
fn unlock_vault(state: State<'_, Mutex<VaultState>>, key_b64: String) -> Result<(), String> {
    let key_bytes = general_purpose::STANDARD
        .decode(key_b64)
        .map_err(|_| "Invalid base64 key")?;

    if key_bytes.len() != 32 {
        return Err("Key must be exactly 32 bytes".into());
    }

    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;

    // If already unlocked, wipe the old key first
    st.lock_and_wipe();

    st.enc_key= Some(key_bytes);
    st.unlocked=true;

    Ok(())
}

/// Locks the vault and securely wipes the encryption key from memory.
#[tauri::command]
fn lock_vault(state: State<'_, Mutex<VaultState>>) -> Result<(), String> {
    let mut st = state.lock().map_err(|_| "VaultState corrupted")?;
    st.lock_and_wipe();
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultEntry {
  pub folder_name: String,
  pub website_url: String,
  pub tags: Vec<String>,
  pub password: String,
}
#[tauri::command]
fn encrypt_entry(state: State<'_, Mutex<VaultState>>,entry: VaultEntry) -> Result<String, String>{
    let st = state.lock().map_err(|_| "VaultState corrupted")?;

    if !st.unlocked {
        return Err("Vault is locked".into());
    }
    // Verify that the key exists.
    let key_bytes = st.enc_key.as_ref().ok_or("Invalid base64 key")?;
    
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes for encryption".into());
    }

    let cipher = Aes256Gcm::new_from_slice(key_bytes).map_err(|_|"Failed to initialize the cipher")?;

    // Generate a unique 12-byte nonce using the OS's cryptographically secure random number generator (CSPRNG).
    // The nonce does not need to be secret, but it must be unique for each encryption operation.
    let mut nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut nonce_bytes).map_err(|e|format!("OS RNG failed: {e}"))?;

    let nonce = Nonce::from_slice(&nonce_bytes);

    // Serialize the vault entry into a JSON byte vector.
    let plaintext = serde_json::to_vec(&entry).map_err(|_|"Failed to serialize entry")?;

    let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|_|"Encryption Failed")?;

    // Construct the payload: [Nonce (12 bytes) | Ciphertext (varying length)].
    // Note: The ciphertext typically includes the authentication tag appended by the GCM mode.
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext); // includes the GCM tag

    // Return the final result as a Base64-encoded string.
    Ok(general_purpose::STANDARD.encode(out))
}
#[tauri::command]
fn decrypt_entry(state: State<'_, Mutex<VaultState>>,blob_b64: String) -> Result<VaultEntry, String>{
    let st = state.lock().map_err(|_| "VaultState corrupted")?;

    if !st.unlocked {
        return Err("Vault is locked".into());
    }

    let key_bytes = st.enc_key.as_ref().ok_or("Invalid base64 key")?;

    if key_bytes.len() != 32 {
        return Err("Key length must be 32 bytes".into());
    }

    let payload = general_purpose::STANDARD.decode(blob_b64).map_err(|_|"Invalid base64 encrypted blob")?;

    // Ensure the payload is long enough to contain the 12-byte nonce.
    if payload.len() < 12{
        return Err("Encrypted Blob is too short".into())
    }   

    let (nonce_bytes, ciphertext) = payload.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_|"Failed to initialize cipher")?;

    // Decrypt the data. The underlying implementation verifies the authentication tag to ensure integrity.
    let plaintext_bytes = cipher.decrypt(nonce, ciphertext).map_err(|_|"Failed to decrypt data (wrong key or corrupted data)")?;

    let entry: VaultEntry = serde_json::from_slice(&plaintext_bytes).map_err(|_| "Decrypted JSON is invalid")?;

    Ok(entry)
}
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
fn change_password_optimization(
    encrypted_mek_blob: String,
    old_password: String,
    new_password: String,
    salt: String,
) -> Result<String, String> {
    use argon2::{
        password_hash::{PasswordHasher, Salt},
        Argon2,
    };
    use zeroize::Zeroizing;

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

    // 2. Derive the Key Encryption Key (KEK) from the old password.
    let old_kek = derive_key(&old_password, &salt_bytes)?;

    // 3. Decrypt the Master Encryption Key (MEK) using the old KEK.
    if stored_wrapped_key_bytes.len() < 12 {
        return Err("Stored wrapped key is too short".into());
    }
    let (nonce_bytes, ciphertext) = stored_wrapped_key_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let cipher_old = Aes256Gcm::new_from_slice(&*old_kek).map_err(|_| "Failed to init cipher with old KEK")?;
    
    // This is the Raw MEK
    // CRITICAL: We successfully obtain the raw MEK. This key remains unchanged to preserve vault data validity.
    // We treat this sensitive data with extreme care.
    let raw_mek = Zeroizing::new(
        cipher_old.decrypt(nonce, ciphertext).map_err(|_| "Failed to decrypt MEK with old password")?
    );

    // 4. Derive the new KEK from the new password.
    let new_kek = derive_key(&new_password, &salt_bytes)?;

    // 5. Encrypt the raw MEK with the new KEK.
    let cipher_new = Aes256Gcm::new_from_slice(&*new_kek).map_err(|_| "Failed to init cipher with new KEK")?;
    
    let mut new_nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut new_nonce_bytes).map_err(|e| format!("OS RNG failed: {}", e))?;
    let new_nonce = Nonce::from_slice(&new_nonce_bytes);
    
    let new_ciphertext = cipher_new.encrypt(new_nonce, raw_mek.as_slice())
        .map_err(|_| "Failed to encrypt MEK with new password")?;

    // 6. Concatenate the new nonce and ciphertext to form the final result.
    let mut out = Vec::new();
    out.extend_from_slice(&new_nonce_bytes);
    out.extend_from_slice(&new_ciphertext);

    Ok(general_purpose::STANDARD.encode(out))
}
