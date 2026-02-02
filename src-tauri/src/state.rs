use zeroize::Zeroize;

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
