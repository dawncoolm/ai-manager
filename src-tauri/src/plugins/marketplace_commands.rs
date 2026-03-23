use super::commands::{add_plugin_github, generate_plugin_id, now_iso8601, read_plugin_json};
use crate::plugins::github;
use crate::plugins::marketplace::*;
use crate::plugins::models::*;
use crate::plugins::storage;
use std::fs;
use std::path::{Path, PathBuf};

/// Returns true if the path contains any ".." (parent directory) components.
fn has_parent_dir_component(path: &Path) -> bool {
    path.components()
        .any(|c| c == std::path::Component::ParentDir)
}

/// Parse a marketplace URL into (owner, repo).
/// Accepts "owner/repo" or "https://github.com/owner/repo[.git]".
fn parse_marketplace_url(url: &str) -> Result<(String, String), String> {
    let trimmed = url.trim().trim_end_matches(".git");
    let stripped = trimmed
        .replace("https://github.com/", "")
        .replace("http://github.com/", "");
    let parts: Vec<&str> = stripped.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() < 2 || parts[0].is_empty() || parts[1].is_empty() {
        return Err("Invalid marketplace URL. Use owner/repo or https://github.com/owner/repo".to_string());
    }
    Ok((parts[0].to_string(), parts[1].to_string()))
}

/// Ensure the marketplace repo is cloned (or updated).
/// Returns the local directory path.
fn ensure_marketplace_cloned(owner: &str, repo: &str) -> Result<PathBuf, String> {
    let marketplaces_dir =
        storage::get_marketplaces_dir().ok_or("Cannot determine home directory")?;
    if !marketplaces_dir.exists() {
        fs::create_dir_all(&marketplaces_dir)
            .map_err(|e| format!("Failed to create marketplaces directory: {}", e))?;
    }

    let target_dir = marketplaces_dir.join(format!("{}--{}", owner, repo));

    if target_dir.exists() {
        github::pull_repo(&target_dir)?;
    } else {
        github::clone_repo(owner, repo, &target_dir)?;
    }

    Ok(target_dir)
}

/// Resolve a marketplace input to a local directory.
/// Supports local filesystem paths and GitHub URLs (owner/repo or full URL).
fn resolve_marketplace_dir(input: &str) -> Result<PathBuf, String> {
    let trimmed = input.trim();

    // Check if it's a local filesystem path (absolute path that exists as a directory)
    let local = PathBuf::from(trimmed);
    if local.is_absolute() && local.is_dir() {
        return Ok(local);
    }

    // Otherwise treat as GitHub
    let (owner, repo) = parse_marketplace_url(trimmed)?;
    ensure_marketplace_cloned(&owner, &repo)
}

/// Read and parse .claude-plugin/marketplace.json from a directory.
fn read_marketplace_json(marketplace_dir: &Path) -> Result<MarketplaceJson, String> {
    let json_path = marketplace_dir
        .join(".claude-plugin")
        .join("marketplace.json");
    if !json_path.exists() {
        return Err(format!(
            "No .claude-plugin/marketplace.json found at {}",
            marketplace_dir.display()
        ));
    }

    let content = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read marketplace.json: {}", e))?;

    serde_json::from_str::<MarketplaceJson>(&content)
        .map_err(|e| format!("Failed to parse marketplace.json: {}", e))
}

/// Predict what plugin ID would be generated for a marketplace plugin entry,
/// so we can check for duplicates in the registry.
fn predict_plugin_id_for_entry(
    entry: &MarketplacePluginEntry,
    marketplace_dir: &Path,
    plugin_root: &Option<String>,
) -> Option<String> {
    match &entry.source {
        MarketplacePluginSource::Path(rel) => {
            // Resolve the plugin directory
            let mut base = marketplace_dir.to_path_buf();
            if let Some(root) = plugin_root {
                let root_path = Path::new(root.trim_start_matches("./"));
                if has_parent_dir_component(root_path) {
                    return None;
                }
                base = base.join(root_path);
            }
            let rel_path = Path::new(rel.trim_start_matches("./"));
            if has_parent_dir_component(rel_path) {
                return None;
            }
            let plugin_dir = base.join(rel_path);
            // Try reading plugin.json for the real name; fallback to entry name
            let name = read_plugin_json(&plugin_dir)
                .map(|pj| pj.name)
                .unwrap_or_else(|_| entry.name.clone());
            let meta = PluginMetadata {
                name,
                description: String::new(),
                version: String::new(),
                author: None,
                license: None,
                keywords: None,
                repository: None,
            };
            let source = PluginSource::Local {
                path: plugin_dir.to_string_lossy().to_string(),
            };
            Some(generate_plugin_id(&source, &meta))
        }
        MarketplacePluginSource::Object(obj) => match obj {
            MarketplaceSourceObject::GitHub { repo, .. } => {
                let parts: Vec<&str> = repo.split('/').collect();
                if parts.len() == 2 {
                    Some(format!("{}--{}", parts[0], parts[1]))
                } else {
                    None
                }
            }
            MarketplaceSourceObject::Url { url, .. } => {
                // Use sanitized URL as ID
                let sanitized: String = url
                    .trim_end_matches(".git")
                    .replace("https://", "")
                    .replace("http://", "")
                    .chars()
                    .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
                    .collect();
                Some(sanitized)
            }
            _ => None,
        },
    }
}

// ── Marketplace commands ──

#[tauri::command]
pub fn fetch_marketplace(url: String) -> Result<MarketplaceInfo, String> {
    let marketplace_dir = resolve_marketplace_dir(&url)?;
    let mkt = read_marketplace_json(&marketplace_dir)?;

    let reg = storage::load_registry()?;
    let existing_ids: Vec<&str> = reg.plugins.iter().map(|p| p.id.as_str()).collect();
    let plugin_root = mkt.metadata.as_ref().and_then(|m| m.plugin_root.clone());

    let plugins: Vec<MarketplacePluginPreview> = mkt
        .plugins
        .iter()
        .map(|entry| {
            let predicted_id =
                predict_plugin_id_for_entry(entry, &marketplace_dir, &plugin_root);
            let already_added = predicted_id
                .as_deref()
                .map(|id| existing_ids.contains(&id))
                .unwrap_or(false);

            MarketplacePluginPreview {
                name: entry.name.clone(),
                description: entry.description.clone(),
                version: entry.version.clone(),
                source_type: entry.source.source_type_label().to_string(),
                already_added,
            }
        })
        .collect();

    Ok(MarketplaceInfo {
        name: mkt.name,
        owner_name: mkt.owner.name,
        description: mkt.metadata.and_then(|m| m.description),
        plugins,
    })
}

fn generate_marketplace_id(name: &str) -> String {
    name.to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .collect()
}

fn run_marketplace_import(
    url: &str,
    marketplace_dir: &Path,
    mkt: &MarketplaceJson,
    marketplace_id: &str,
) -> Result<MarketplaceImportResult, String> {
    let plugin_root = mkt.metadata.as_ref().and_then(|m| m.plugin_root.clone());
    let total = mkt.plugins.len();
    let mut succeeded = 0usize;
    let mut skipped = 0usize;
    let mut failed = 0usize;
    let mut results = Vec::new();

    for entry in &mkt.plugins {
        match import_single_plugin(entry, marketplace_dir, &plugin_root, marketplace_id) {
            Ok(status) => {
                match status.status.as_str() {
                    "success" => succeeded += 1,
                    "skipped" => skipped += 1,
                    _ => failed += 1,
                }
                results.push(status);
            }
            Err(e) => {
                failed += 1;
                results.push(PluginImportStatus {
                    plugin_name: entry.name.clone(),
                    status: "failed".to_string(),
                    message: Some(e),
                });
            }
        }
    }

    // Save or update marketplace entry in registry
    let mut reg = storage::load_registry()?;
    reg.marketplaces.retain(|m| m.id != marketplace_id);
    reg.marketplaces.push(MarketplaceEntry {
        id: marketplace_id.to_string(),
        url: url.to_string(),
        name: mkt.name.clone(),
        owner_name: mkt.owner.name.clone(),
        plugin_count: mkt.plugins.len(),
        added_at: now_iso8601(),
    });
    storage::save_registry(&reg)?;

    Ok(MarketplaceImportResult {
        total,
        succeeded,
        skipped,
        failed,
        results,
    })
}

#[tauri::command]
pub fn import_marketplace_plugins(url: String) -> Result<MarketplaceImportResult, String> {
    let marketplace_dir = resolve_marketplace_dir(&url)?;
    let mkt = read_marketplace_json(&marketplace_dir)?;
    let marketplace_id = generate_marketplace_id(&mkt.name);
    run_marketplace_import(&url, &marketplace_dir, &mkt, &marketplace_id)
}

fn import_single_plugin(
    entry: &MarketplacePluginEntry,
    marketplace_dir: &Path,
    plugin_root: &Option<String>,
    marketplace_id: &str,
) -> Result<PluginImportStatus, String> {
    match &entry.source {
        MarketplacePluginSource::Path(rel_path) => {
            import_relative_path_plugin(entry, marketplace_dir, plugin_root, rel_path, marketplace_id)
        }
        MarketplacePluginSource::Object(obj) => match obj {
            MarketplaceSourceObject::GitHub { repo, .. } => {
                import_github_plugin(entry, repo, marketplace_id)
            }
            MarketplaceSourceObject::Url { url, .. } => {
                import_git_url_plugin(entry, url, marketplace_id)
            }
            MarketplaceSourceObject::GitSubdir { url, path, .. } => {
                // Treat git-subdir as a git URL clone; subdirectory support is not yet implemented
                import_git_url_plugin(entry, url, marketplace_id)
                    .map(|mut s| {
                        if s.status == "success" {
                            s.message = Some(format!(
                                "Cloned repository (subdirectory '{}' not yet supported)",
                                path
                            ));
                        }
                        s
                    })
            }
            MarketplaceSourceObject::Npm { .. } => Ok(PluginImportStatus {
                plugin_name: entry.name.clone(),
                status: "failed".to_string(),
                message: Some("npm source type is not supported yet".to_string()),
            }),
        },
    }
}

fn import_relative_path_plugin(
    entry: &MarketplacePluginEntry,
    marketplace_dir: &Path,
    plugin_root: &Option<String>,
    rel_path: &str,
    marketplace_id: &str,
) -> Result<PluginImportStatus, String> {
    let mut base = marketplace_dir.to_path_buf();
    if let Some(root) = plugin_root {
        let root_path = Path::new(root.trim_start_matches("./"));
        if has_parent_dir_component(root_path) {
            return Ok(PluginImportStatus {
                plugin_name: entry.name.clone(),
                status: "failed".to_string(),
                message: Some("Invalid plugin root: path traversal not allowed".to_string()),
            });
        }
        base = base.join(root_path);
    }
    let rel = Path::new(rel_path.trim_start_matches("./"));
    if has_parent_dir_component(rel) {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "failed".to_string(),
            message: Some("Invalid plugin path: path traversal not allowed".to_string()),
        });
    }
    let plugin_dir = base.join(rel);

    if !plugin_dir.exists() || !plugin_dir.is_dir() {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "failed".to_string(),
            message: Some(format!(
                "Plugin directory not found: {}",
                plugin_dir.display()
            )),
        });
    }

    // Read metadata: prefer plugin.json, fallback to marketplace entry
    let metadata = match read_plugin_json(&plugin_dir) {
        Ok(pj) => pj.into(),
        Err(_) => PluginMetadata {
            name: entry.name.clone(),
            description: entry.description.clone().unwrap_or_default(),
            version: entry.version.clone().unwrap_or_default(),
            author: entry.author.as_ref().map(|a| a.display_name()),
            license: None,
            keywords: entry.keywords.clone(),
            repository: entry.repository.clone(),
        },
    };

    let source = PluginSource::Local {
        path: plugin_dir.to_string_lossy().to_string(),
    };
    let id = generate_plugin_id(&source, &metadata);

    let mut reg = storage::load_registry()?;
    if reg.plugins.iter().any(|p| p.id == id) {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "skipped".to_string(),
            message: Some("Already added".to_string()),
        });
    }

    let plugin_entry = PluginEntry {
        id,
        source,
        local_path: plugin_dir.to_string_lossy().to_string(),
        metadata,
        added_at: now_iso8601(),
        marketplace_id: Some(marketplace_id.to_string()),
    };

    reg.plugins.push(plugin_entry);
    storage::save_registry(&reg)?;

    Ok(PluginImportStatus {
        plugin_name: entry.name.clone(),
        status: "success".to_string(),
        message: None,
    })
}

fn import_github_plugin(
    entry: &MarketplacePluginEntry,
    repo_ref: &str,
    marketplace_id: &str,
) -> Result<PluginImportStatus, String> {
    let parts: Vec<&str> = repo_ref.split('/').collect();
    if parts.len() != 2 {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "failed".to_string(),
            message: Some(format!("Invalid GitHub repo format: {}", repo_ref)),
        });
    }

    let owner = parts[0].to_string();
    let repo = parts[1].to_string();

    // Check if already added
    let expected_id = format!("{}--{}", owner, repo);
    let reg = storage::load_registry()?;
    if reg.plugins.iter().any(|p| p.id == expected_id) {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "skipped".to_string(),
            message: Some("Already added".to_string()),
        });
    }

    // Reuse existing add_plugin_github logic
    match add_plugin_github(owner, repo) {
        Ok(_) => {
            // Tag the newly-added plugin with marketplace_id
            let mut reg = storage::load_registry()?;
            if let Some(p) = reg.plugins.iter_mut().find(|p| p.id == expected_id) {
                p.marketplace_id = Some(marketplace_id.to_string());
            }
            storage::save_registry(&reg)?;
            Ok(PluginImportStatus {
                plugin_name: entry.name.clone(),
                status: "success".to_string(),
                message: None,
            })
        }
        Err(e) => Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "failed".to_string(),
            message: Some(e),
        }),
    }
}

fn import_git_url_plugin(
    entry: &MarketplacePluginEntry,
    git_url: &str,
    marketplace_id: &str,
) -> Result<PluginImportStatus, String> {
    let repos_dir = storage::get_repos_dir().ok_or("Cannot determine home directory")?;
    if !repos_dir.exists() {
        fs::create_dir_all(&repos_dir)
            .map_err(|e| format!("Failed to create repos directory: {}", e))?;
    }

    // Generate a sanitized directory name from the URL
    let dir_name: String = git_url
        .trim_end_matches(".git")
        .replace("https://", "")
        .replace("http://", "")
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
        .collect();

    let target_dir = repos_dir.join(&dir_name);

    if target_dir.exists() {
        github::pull_repo(&target_dir)?;
    } else {
        github::clone_git_url(git_url, &target_dir).map_err(|e| {
            let _ = fs::remove_dir_all(&target_dir);
            e
        })?;
    }

    // Read metadata: prefer plugin.json, fallback to marketplace entry
    let metadata = match read_plugin_json(&target_dir) {
        Ok(pj) => pj.into(),
        Err(_) => PluginMetadata {
            name: entry.name.clone(),
            description: entry.description.clone().unwrap_or_default(),
            version: entry.version.clone().unwrap_or_default(),
            author: entry.author.as_ref().map(|a| a.display_name()),
            license: None,
            keywords: entry.keywords.clone(),
            repository: entry.repository.clone(),
        },
    };

    let source = PluginSource::Local {
        path: target_dir.to_string_lossy().to_string(),
    };
    let id = generate_plugin_id(&source, &metadata);

    let mut reg = storage::load_registry()?;
    if reg.plugins.iter().any(|p| p.id == id) {
        return Ok(PluginImportStatus {
            plugin_name: entry.name.clone(),
            status: "skipped".to_string(),
            message: Some("Already added".to_string()),
        });
    }

    let plugin_entry = PluginEntry {
        id,
        source,
        local_path: target_dir.to_string_lossy().to_string(),
        metadata,
        added_at: now_iso8601(),
        marketplace_id: Some(marketplace_id.to_string()),
    };

    reg.plugins.push(plugin_entry);
    storage::save_registry(&reg)?;

    Ok(PluginImportStatus {
        plugin_name: entry.name.clone(),
        status: "success".to_string(),
        message: None,
    })
}

// ── Marketplace management commands ──

#[tauri::command]
pub fn list_marketplaces() -> Result<Vec<MarketplaceEntry>, String> {
    let reg = storage::load_registry()?;
    Ok(reg.marketplaces)
}

#[tauri::command]
pub fn update_marketplace(marketplace_id: String) -> Result<MarketplaceImportResult, String> {
    let reg = storage::load_registry()?;
    let mkt_entry = reg
        .marketplaces
        .iter()
        .find(|m| m.id == marketplace_id)
        .ok_or_else(|| format!("Marketplace not found: {}", marketplace_id))?
        .clone();

    let marketplace_dir = resolve_marketplace_dir(&mkt_entry.url)?;
    let mkt = read_marketplace_json(&marketplace_dir)?;

    // Update metadata for existing plugins from this marketplace
    {
        let mut reg = storage::load_registry()?;
        for plugin in reg.plugins.iter_mut().filter(|p| {
            p.marketplace_id.as_deref() == Some(marketplace_id.as_str())
        }) {
            let plugin_dir = PathBuf::from(&plugin.local_path);
            if let Ok(pj) = read_plugin_json(&plugin_dir) {
                plugin.metadata = pj.into();
            }
        }
        storage::save_registry(&reg)?;
    }

    // Import any new plugins that don't exist yet
    run_marketplace_import(&mkt_entry.url, &marketplace_dir, &mkt, &marketplace_id)
}

#[tauri::command]
pub fn remove_marketplace(marketplace_id: String) -> Result<(), String> {
    let mut reg = storage::load_registry()?;

    let mkt_entry = reg
        .marketplaces
        .iter()
        .find(|m| m.id == marketplace_id)
        .ok_or_else(|| format!("Marketplace not found: {}", marketplace_id))?
        .clone();

    // Remove plugins from this marketplace; delete cloned repos for GitHub ones
    let plugins_to_remove: Vec<PluginEntry> = reg
        .plugins
        .iter()
        .filter(|p| p.marketplace_id.as_deref() == Some(marketplace_id.as_str()))
        .cloned()
        .collect();

    for plugin in &plugins_to_remove {
        if let PluginSource::GitHub { .. } = &plugin.source {
            let repo_path = PathBuf::from(&plugin.local_path);
            if repo_path.exists() {
                let _ = fs::remove_dir_all(&repo_path);
            }
        }
    }

    reg.plugins
        .retain(|p| p.marketplace_id.as_deref() != Some(marketplace_id.as_str()));
    reg.marketplaces.retain(|m| m.id != marketplace_id);

    // Clean up cloned marketplace directory if GitHub-sourced
    if let Some(marketplaces_dir) = storage::get_marketplaces_dir() {
        let trimmed = mkt_entry.url.trim();
        let stripped = trimmed
            .replace("https://github.com/", "")
            .replace("http://github.com/", "");
        let stripped = stripped.trim_end_matches(".git");
        let parts: Vec<&str> = stripped.split('/').filter(|s| !s.is_empty()).collect();
        if parts.len() >= 2 {
            let dir = marketplaces_dir.join(format!("{}--{}", parts[0], parts[1]));
            if dir.exists() {
                let _ = fs::remove_dir_all(&dir);
            }
        }
    }

    storage::save_registry(&reg)?;
    Ok(())
}
