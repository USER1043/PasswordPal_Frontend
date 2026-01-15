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
            lock_vault
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
