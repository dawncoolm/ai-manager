use serde::{Deserialize, Serialize};

use crate::plugins::models::PluginAuthorOrString;

// ── Parsed from .claude-plugin/marketplace.json ──

#[derive(Debug, Clone, Deserialize)]
pub struct MarketplaceJson {
    pub name: String,
    pub owner: MarketplaceOwner,
    pub metadata: Option<MarketplaceMetadata>,
    pub plugins: Vec<MarketplacePluginEntry>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct MarketplaceOwner {
    pub name: String,
    pub email: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct MarketplaceMetadata {
    pub description: Option<String>,
    pub version: Option<String>,
    #[serde(rename = "pluginRoot")]
    pub plugin_root: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MarketplacePluginEntry {
    pub name: String,
    pub source: MarketplacePluginSource,
    pub description: Option<String>,
    pub version: Option<String>,
    pub author: Option<PluginAuthorOrString>,
    pub keywords: Option<Vec<String>>,
    pub repository: Option<String>,
}

/// Plugin source: either a relative path string or a source object.
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum MarketplacePluginSource {
    Path(String),
    Object(MarketplaceSourceObject),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "source")]
#[allow(dead_code)]
pub enum MarketplaceSourceObject {
    #[serde(rename = "github")]
    GitHub {
        repo: String,
        #[serde(rename = "ref")]
        git_ref: Option<String>,
        sha: Option<String>,
    },
    #[serde(rename = "url")]
    Url {
        url: String,
        #[serde(rename = "ref")]
        git_ref: Option<String>,
        sha: Option<String>,
    },
    #[serde(rename = "git-subdir")]
    GitSubdir {
        url: String,
        path: String,
        #[serde(rename = "ref")]
        git_ref: Option<String>,
        sha: Option<String>,
    },
    #[serde(rename = "npm")]
    Npm {
        package: String,
        version: Option<String>,
        registry: Option<String>,
    },
}

// ── Return types for the frontend ──

#[derive(Debug, Clone, Serialize)]
pub struct MarketplaceInfo {
    pub name: String,
    pub owner_name: String,
    pub description: Option<String>,
    pub plugins: Vec<MarketplacePluginPreview>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MarketplacePluginPreview {
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub source_type: String,
    pub already_added: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct MarketplaceImportResult {
    pub total: usize,
    pub succeeded: usize,
    pub skipped: usize,
    pub failed: usize,
    pub results: Vec<PluginImportStatus>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PluginImportStatus {
    pub plugin_name: String,
    pub status: String,
    pub message: Option<String>,
}

// ── Helpers ──

impl MarketplacePluginSource {
    pub fn source_type_label(&self) -> &str {
        match self {
            MarketplacePluginSource::Path(_) => "local",
            MarketplacePluginSource::Object(obj) => match obj {
                MarketplaceSourceObject::GitHub { .. } => "github",
                MarketplaceSourceObject::Url { .. } => "url",
                MarketplaceSourceObject::GitSubdir { .. } => "git-subdir",
                MarketplaceSourceObject::Npm { .. } => "npm",
            },
        }
    }
}
