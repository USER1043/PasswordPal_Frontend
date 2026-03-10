use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultEntry {
    pub name: String,
    pub username: String,
    pub folder_name: String,
    pub website_url: String,
    pub tags: Vec<String>,
    pub password: String,
    pub notes: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultRecord {
    pub id: String,
    pub entry: VaultEntry,
    pub version: i64,
    pub sync_status: String,
    pub record_type: String,
}
