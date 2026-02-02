use tauri::State;
use std::sync::Mutex;
use aes_gcm::{
  aead::{Aead, KeyInit},
  Aes256Gcm, Nonce
};
use base64::{engine::general_purpose, Engine as _};
use rand_core::{OsRng, TryRngCore};
use crate::state::VaultState;
use crate::models::VaultEntry;

#[tauri::command]
pub fn encrypt_entry(state: State<'_, Mutex<VaultState>>,entry: VaultEntry) -> Result<String, String>{
    let st = state.lock().map_err(|_| "VaultState corrupted")?;
    encrypt_entry_logic(&st, &entry)
}

pub fn encrypt_entry_logic(st: &VaultState, entry: &VaultEntry) -> Result<String, String> {
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
pub fn decrypt_entry(state: State<'_, Mutex<VaultState>>,blob_b64: String) -> Result<VaultEntry, String>{
    let st = state.lock().map_err(|_| "VaultState corrupted")?;
    decrypt_entry_logic(&st, &blob_b64)
}

pub fn decrypt_entry_logic(st: &VaultState, blob_b64: &str) -> Result<VaultEntry, String> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::VaultState;
    use crate::models::VaultEntry;

    fn get_test_key() -> Vec<u8> {
        vec![0u8; 32] // 32 bytes of zeros
    }

    #[test]
    fn test_encrypt_decrypt_flow() {
        let mut state = VaultState::default();
        state.unlocked = true;
        state.enc_key = Some(get_test_key());

        let entry = VaultEntry {
            folder_name: "Test".into(),
            website_url: "example.com".into(),
            tags: vec!["tag1".into()],
            password: "secret".into(),
        };

        // Encrypt
        let enc_result = encrypt_entry_logic(&state, &entry);
        assert!(enc_result.is_ok());
        let encrypted_blob = enc_result.unwrap();

        // Decrypt
        let dec_result = decrypt_entry_logic(&state, &encrypted_blob);
        assert!(dec_result.is_ok());
        let decrypted_entry = dec_result.unwrap();

        // Verify equality
        assert_eq!(entry.password, decrypted_entry.password);
        assert_eq!(entry.website_url, decrypted_entry.website_url);
    }

    #[test]
    fn test_encrypt_fail_when_locked() {
        let state = VaultState::default(); // Locked by default
        let entry = VaultEntry {
            folder_name: "Test".into(),
            website_url: "example.com".into(),
            tags: vec![],
            password: "secret".into(),
        };

        let result = encrypt_entry_logic(&state, &entry);
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "Vault is locked");
    }

    #[test]
    fn test_decrypt_fail_tampered_data() {
        let mut state = VaultState::default();
        state.unlocked = true;
        state.enc_key = Some(get_test_key());

        // Valid data encryption
        let entry = VaultEntry {
            folder_name: "Test".into(),
            website_url: "example.com".into(),
            tags: vec![],
            password: "secret".into(),
        };
        let blob = encrypt_entry_logic(&state, &entry).unwrap();
        
        // Tamper with the base64 string (change last char)
        let mut tampered_blob = blob.clone();
        tampered_blob.pop();
        tampered_blob.push('A'); // Just changing a char to corrupt it

        let result = decrypt_entry_logic(&state, &tampered_blob);
        
        // It should fail either at base64 decode or GCM decryption (tag verification)
        assert!(result.is_err());
    }
}
