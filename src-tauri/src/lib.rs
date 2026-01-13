// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            encrypt_data,
            decrypt_data
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use aes_gcm::{
    Aes256Gcm, Nonce, aead::{Aead, KeyInit}
};
use rand::{TryRngCore, rngs::OsRng};
use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
fn encrypt_data(plaintext: String, key_b64: String) -> Result<String, String>{
    // key must be 32 bytes
    let key_bytes = general_purpose::STANDARD.decode(key_b64).map_err(|_| "Invalid base64 key")?;
    
    if key_bytes.len() != 32 {
        return Err("Key must be 32 bytes for encryption".into());
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_|"Failed to initialize the cipher")?;

    // nonce must be 12 bytes
    let mut nonce_bytes = [0u8; 12];
    OsRng.try_fill_bytes(&mut nonce_bytes).map_err(|e|format!("OS RNG failed: {e}"))?;

    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes()).map_err(|_|"Encryption Failed")?;

    // output: Nonce + ciphertext  -> base64
    let mut out = Vec::new();
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(out))
}

#[tauri::command]
fn decrypt_data(payload_b64: String, key_b64:String) -> Result<String, String>{
    let key_bytes = general_purpose::STANDARD.decode(key_b64).map_err(|_|"Invalid base64 key")?;

    if key_bytes.len() != 32 {
        return Err("Key length must be 32 bytes".into());
    }

    let payload = general_purpose::STANDARD.decode(payload_b64).map_err(|_|"Invalid base64 payload")?;

    // Because the nonce is 12 bytes
    if payload.len() < 12{
        return Err("Payload is too short".into())
    }   

    let (nonce_bytes, ciphertext) = payload.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key_bytes).map_err(|_|"Failed to initialize cipher")?;

    let plaintext_bytes = cipher.decrypt(nonce, ciphertext).map_err(|_|"Failed to decrypt data (wrong key or corrupted data)")?;

    String::from_utf8(plaintext_bytes).map_err(|_|"Decrypted text is not a valid UTF-8 data".into())
}
