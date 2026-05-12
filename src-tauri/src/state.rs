use zeroize::Zeroizing;

/// Manages the vault's runtime state, securely holding the encryption key when unlocked.
#[derive(Default)]
pub struct VaultState {
    enc_key: Option<Zeroizing<Vec<u8>>>,
}
impl VaultState {
    pub fn unlock(&mut self, key: Vec<u8>) {
        self.enc_key = Some(Zeroizing::new(key));
    }

    pub fn lock(&mut self) {
        self.enc_key = None;
    }
    
    pub fn key(&self) -> Option<&[u8]> {
        self.enc_key.as_deref().map(|k| k.as_slice())
    }
    
    pub fn is_unlocked(&self) -> bool {
        self.enc_key.is_some()
    }
    
}
