use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultEntry {
  pub name: String,
  pub username: String,
  pub folder_name: String,
  pub website_url: String,
  pub tags: Vec<String>,
  pub password: String,
  pub notes: String,
}
