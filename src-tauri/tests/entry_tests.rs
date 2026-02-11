use passwordpal_lib::commands::entry::{encrypt_entry_logic, decrypt_entry_logic};
use passwordpal_lib::state::VaultState;
use passwordpal_lib::models::VaultEntry;

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
