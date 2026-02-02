use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultEntry {
  pub folder_name: String,
  pub website_url: String,
  pub tags: Vec<String>,
  pub password: String,
}
