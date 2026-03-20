use crate::cache::models::*;
use crate::cache::registry;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn file_size(path: &Path) -> u64 {
    fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

fn clear_dir_contents(path: &Path) -> (u64, Vec<String>) {
    let mut freed: u64 = 0;
    let mut errors: Vec<String> = Vec::new();

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(e) => {
            errors.push(format!("{}: {}", path.display(), e));
            return (freed, errors);
        }
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let entry_path = entry.path();
        let size = if entry_path.is_dir() {
            dir_size(&entry_path)
        } else {
            file_size(&entry_path)
        };

        let result = if entry_path.is_dir() {
            fs::remove_dir_all(&entry_path)
        } else {
            fs::remove_file(&entry_path)
        };

        match result {
            Ok(()) => freed += size,
            Err(e) => errors.push(format!("{}: {}", entry_path.display(), e)),
        }
    }

    (freed, errors)
}

fn clear_cache_paths(tool_id: &str) -> ClearCacheResult {
    let cache_registry = registry::get_cache_registry();
    let cache_def = match cache_registry.iter().find(|d| d.tool_id == tool_id) {
        Some(d) => d,
        None => {
            return ClearCacheResult {
                freed_bytes: 0,
                errors: vec![format!("No cache definition for tool: {}", tool_id)],
            }
        }
    };

    let base_dir = match registry::resolve_tool_base_dir(tool_id) {
        Some(d) => d,
        None => {
            return ClearCacheResult {
                freed_bytes: 0,
                errors: vec!["Cannot determine home directory".to_string()],
            }
        }
    };

    let mut total_freed: u64 = 0;
    let mut all_errors: Vec<String> = Vec::new();

    for cache_path in cache_def.paths {
        let full_path = base_dir.join(cache_path.subpath);
        if !full_path.exists() {
            continue;
        }

        if cache_path.is_file {
            let size = file_size(&full_path);
            match fs::remove_file(&full_path) {
                Ok(()) => total_freed += size,
                Err(e) => all_errors.push(format!("{}: {}", full_path.display(), e)),
            }
        } else {
            let (freed, errors) = clear_dir_contents(&full_path);
            total_freed += freed;
            all_errors.extend(errors);
        }
    }

    ClearCacheResult {
        freed_bytes: total_freed,
        errors: all_errors,
    }
}

#[tauri::command]
pub fn get_cache_info() -> Result<Vec<ToolCacheInfo>, String> {
    let cache_registry = registry::get_cache_registry();
    let mut result = Vec::new();

    for cache_def in &cache_registry {
        let tool_name = registry::resolve_tool_name(cache_def.tool_id);
        let base_dir = match registry::resolve_tool_base_dir(cache_def.tool_id) {
            Some(d) => d,
            None => continue,
        };

        let mut cache_paths = Vec::new();
        let mut total_size: u64 = 0;

        for cache_path in cache_def.paths {
            let full_path = base_dir.join(cache_path.subpath);
            let exists = full_path.exists();
            let size = if exists {
                if cache_path.is_file {
                    file_size(&full_path)
                } else {
                    dir_size(&full_path)
                }
            } else {
                0
            };

            total_size += size;

            cache_paths.push(CachePathInfo {
                label: cache_path.label.to_string(),
                full_path: full_path.to_string_lossy().to_string(),
                size_bytes: size,
                exists,
            });
        }

        result.push(ToolCacheInfo {
            tool_id: cache_def.tool_id.to_string(),
            tool_name,
            cache_size_bytes: total_size,
            cache_paths,
            has_cache: total_size > 0,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn clear_tool_cache(tool_id: String) -> Result<ClearCacheResult, String> {
    Ok(clear_cache_paths(&tool_id))
}

#[tauri::command]
pub fn clear_all_caches() -> Result<ClearCacheResult, String> {
    let cache_registry = registry::get_cache_registry();
    let mut total_freed: u64 = 0;
    let mut all_errors: Vec<String> = Vec::new();

    for cache_def in &cache_registry {
        let result = clear_cache_paths(cache_def.tool_id);
        total_freed += result.freed_bytes;
        all_errors.extend(result.errors);
    }

    Ok(ClearCacheResult {
        freed_bytes: total_freed,
        errors: all_errors,
    })
}
