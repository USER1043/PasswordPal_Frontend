use argon2::password_hash::{PasswordHasher, Salt};
use base64::{engine::general_purpose, Engine as _};
use rand_core::{OsRng, TryRngCore};
use zeroize::Zeroizing;

/// Returns consistent Argon2id security parameters used throughout the system
/// - Memory (m): 64 MiB (65536 KiB)
/// - Time/Iterations (t): 3 passes
/// - Parallelism (p): 4 lanes/threads
/// - Algorithm: Argon2id
/// - Version: 0x13 (latest)
fn get_argon2_params() -> argon2::Params {
    argon2::Params::new(65536, 3, 4, None).unwrap()
}

/// Generates a random 32-byte Master Encryption Key (MEK)
pub fn generate_mek() -> Result<Zeroizing<[u8; 32]>, String> {
    let mut mek = Zeroizing::new([0u8; 32]);
    OsRng
        .try_fill_bytes(&mut *mek)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    Ok(mek)
}

/// Generates a random 16-byte Salt
pub fn generate_salt() -> Result<[u8; 16], String> {
    let mut salt = [0u8; 16];
    OsRng
        .try_fill_bytes(&mut salt)
        .map_err(|e| format!("OS RNG failed: {}", e))?;
    Ok(salt)
}

/// Derives the Key Encryption Key (KEK) from password and salt using Argon2id.
///
/// Security Parameters (consistent across system):
/// - Memory (m): 64 MiB (65536 KiB)
/// - Time/Iterations (t): 3 passes
/// - Parallelism (p): 4 lanes/threads
/// - Algorithm: Argon2id
/// - Version: 0x13 (latest)
///
/// Params:
/// - password: User's master password
/// - salt: User's unique salt (raw bytes)
///
/// Returns:
/// - Zeroizing<[u8; 32]>: The 32-byte derived KEK, protected from memory dumps.
pub fn derive_kek(password: &str, salt_bytes: &[u8]) -> Result<Zeroizing<[u8; 32]>, String> {
    let mut output_key = Zeroizing::new([0u8; 32]);

    let argon2 = argon2::Argon2::new(
        argon2::Algorithm::Argon2id,
        argon2::Version::V0x13,
        get_argon2_params(),
    );

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

/// Derives the recovery verifier sent to the server at registration and recovery.
///
/// The recovery key is the raw MEK (base64) and must never leave the device.
/// The server only needs to check that the same key is presented again, so it
/// gets a one-way, domain-separated BLAKE3 derivation of it: 64 hex characters.
///
/// This must be deterministic - the value sent during recovery has to equal the
/// one sent at registration, so no random salt. The MEK is 256 random bits, so
/// a fast hash is enough here; the server stores an Argon2id hash of the verifier.
pub fn hash_recovery_key(recovery_key: &str) -> Result<String, String> {
    let mek = Zeroizing::new(
        general_purpose::STANDARD
            .decode(recovery_key.trim())
            .map_err(|_| "Invalid recovery key: not valid base64")?,
    );

    if mek.len() != 32 {
        return Err("Invalid recovery key: wrong length".into());
    }

    let verifier = blake3::derive_key("passwordpal_recovery_verifier_v1", &mek);
    Ok(hex::encode(verifier))
}
