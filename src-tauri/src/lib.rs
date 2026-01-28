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

// THis is the vault state management using built-in manager
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

// Unlocking the vault 
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
    // key must be 32 bytes
    let key_bytes = st.enc_key.as_ref().ok_or("Invalid base64 key")?;
    
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes for encryption".into());
    }

    let cipher = Aes256Gcm::new_from_slice(key_bytes).map_err(|_|"Failed to initialize the cipher")?;

    // nonce must be 12 bytes
    // this is OS CSPRNG function 
    // nonce need not be secret but must be unique
    let mut nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut nonce_bytes).map_err(|e|format!("OS RNG failed: {e}"))?;

    let nonce = Nonce::from_slice(&nonce_bytes);

    // convert entry -> JSON bytes
    let plaintext = serde_json::to_vec(&entry).map_err(|_|"Failed to serialize entry")?;

    let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|_|"Encryption Failed")?;

    // output: Nonce + ciphertext  -> base64
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext); // includes the GCM tag

    // return base64 blob for frontend
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

    // Because the nonce is 12 bytes
    if payload.len() < 12{
        return Err("Encrypted Blob is too short".into())
    }   

    let (nonce_bytes, ciphertext) = payload.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_|"Failed to initialize cipher")?;

    // the ciphertext here actually is cipher plus tag, so decrypt also verifies the tag for tampering.
    let plaintext_bytes = cipher.decrypt(nonce, ciphertext).map_err(|_|"Failed to decrypt data (wrong key or corrupted data)")?;

    let entry: VaultEntry = serde_json::from_slice(&plaintext_bytes).map_err(|_| "Decrypted JSON is invalid")?;

    Ok(entry)
}
/// Changes the user's password by re-wrapping the Master Encryption Key (MEK).
/// 
/// # Efficiency Explanation (O(1) vs O(N))
/// 
/// This function demonstrates an O(1) operation regarding the number of items in the vault.
/// instead of decrypting and re-encrypting every single vault entry (which would be O(N) where N is the number of entries),
/// we only re-encrypt the Master Encryption Key (MEK) itself.
/// 
/// Architecture:
/// - MEK (Master Encryption Key): Randomly generated key that encrypts the actual vault data. This NEVER changes.
/// - KEK (Key Encryption Key): Derived from the User's Password. This encrypts the MEK.
/// 
/// When the user changes their password:
/// 1. We derive the Old KEK from the Old Password.
/// 2. We decrypt the MEK using the Old KEK. (Accessing the MEK)
/// 3. We derive the New KEK from the New Password.
/// 4. We encrypt the SAME MEK using the New KEK.
/// 
/// IMPORTANT: The actual vault items are encrypted with the MEK. Since the MEK itself does not change (only its wrapper changes),
/// the vault items remain untouched and valid. This ensures the operation is constant time O(1) regardless of vault size.
///
/// Security: The raw MEK is held in memory only briefly and is zeroed out (dropped) immediately after re-encryption
/// due to the `Zeroizing` wrapper, complying with security best practices.
#[tauri::command]
fn change_password_optimization(
    encrypted_mek_blob: String, // Renamed from stored_wrapped_key for clarity
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

    // Helper to derive key
    fn derive_key(password: &str, salt_bytes: &[u8]) -> Result<Zeroizing<[u8; 32]>, String> {
         let mut output_key = Zeroizing::new([0u8; 32]);
         let argon2 = Argon2::default();
         
         // Fix lifetime: bind encoded string to a variable
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

    // 2. Derive old_kek
    let old_kek = derive_key(&old_password, &salt_bytes)?;

    // 3. Decrypt stored_wrapped_key
    if stored_wrapped_key_bytes.len() < 12 {
        return Err("Stored wrapped key is too short".into());
    }
    let (nonce_bytes, ciphertext) = stored_wrapped_key_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let cipher_old = Aes256Gcm::new_from_slice(&*old_kek).map_err(|_| "Failed to init cipher with old KEK")?;
    
    // This is the Raw MEK
    // CRITICAL: We obtain the Raw MEK here. All vault items are encrypted with this key.
    // We do NOT touch the vault items.
    let raw_mek = Zeroizing::new(
        cipher_old.decrypt(nonce, ciphertext).map_err(|_| "Failed to decrypt MEK with old password")?
    );

    // 4. Derive new_kek
    let new_kek = derive_key(&new_password, &salt_bytes)?;

    // 5. Re-encrypt raw MEK with new_kek
    let cipher_new = Aes256Gcm::new_from_slice(&*new_kek).map_err(|_| "Failed to init cipher with new KEK")?;
    
    let mut new_nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut new_nonce_bytes).map_err(|e| format!("OS RNG failed: {}", e))?;
    let new_nonce = Nonce::from_slice(&new_nonce_bytes);
    
    let new_ciphertext = cipher_new.encrypt(new_nonce, raw_mek.as_slice())
        .map_err(|_| "Failed to encrypt MEK with new password")?;

    // 6. Construct result
    let mut out = Vec::new();
    out.extend_from_slice(&new_nonce_bytes);
    out.extend_from_slice(&new_ciphertext);

    Ok(general_purpose::STANDARD.encode(out))
}
