use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Clone)]
pub struct McpToolInfo {
    pub id: String,
    pub name: String,
    pub config_path: String,
    pub detected: bool,
    pub config_exists: bool,
    pub server_count: usize,
}

#[derive(Serialize, Clone)]
pub struct McpServerEntry {
    pub name: String,
    pub server_type: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub url: Option<String>,
    pub headers: HashMap<String, String>,
}

#[derive(Deserialize, Clone)]
pub struct McpServerConfig {
    pub server_type: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub url: Option<String>,
    pub headers: HashMap<String, String>,
}
