use crate::mcp::models::*;
use crate::mcp::registry;
use std::fs;
use std::path::{Path, PathBuf};

fn read_json(path: &Path) -> serde_json::Value {
    if !path.exists() {
        return serde_json::Value::Object(Default::default());
    }
    let content = fs::read_to_string(path).unwrap_or_default();
    serde_json::from_str(&content)
        .unwrap_or_else(|_| serde_json::Value::Object(Default::default()))
}

fn write_json(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

fn count_servers(path: &Path, servers_key: &str) -> usize {
    let json = read_json(path);
    json.get(servers_key)
        .and_then(|v| v.as_object())
        .map(|obj| obj.len())
        .unwrap_or(0)
}

fn json_to_server_entry(name: String, value: &serde_json::Value) -> McpServerEntry {
    let server_type = if value.get("url").is_some() {
        "http".to_string()
    } else {
        "stdio".to_string()
    };

    let command = value.get("command").and_then(|v| v.as_str()).map(String::from);

    let args = value
        .get("args")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str())
                .map(String::from)
                .collect()
        })
        .unwrap_or_default();

    let env = value
        .get("env")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();

    let url = value.get("url").and_then(|v| v.as_str()).map(String::from);

    let headers = value
        .get("headers")
        .and_then(|v| v.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();

    McpServerEntry {
        name,
        server_type,
        command,
        args,
        env,
        url,
        headers,
    }
}

fn server_config_to_json(config: &McpServerConfig) -> serde_json::Value {
    let mut map = serde_json::Map::new();

    if config.server_type == "http" {
        if let Some(url) = &config.url {
            map.insert("url".to_string(), serde_json::Value::String(url.clone()));
        }
        if !config.headers.is_empty() {
            let headers: serde_json::Map<String, serde_json::Value> = config
                .headers
                .iter()
                .map(|(k, v)| (k.clone(), serde_json::Value::String(v.clone())))
                .collect();
            map.insert("headers".to_string(), serde_json::Value::Object(headers));
        }
    } else {
        if let Some(command) = &config.command {
            map.insert(
                "command".to_string(),
                serde_json::Value::String(command.clone()),
            );
        }
        if !config.args.is_empty() {
            map.insert(
                "args".to_string(),
                serde_json::Value::Array(
                    config
                        .args
                        .iter()
                        .map(|a| serde_json::Value::String(a.clone()))
                        .collect(),
                ),
            );
        }
        if !config.env.is_empty() {
            let env: serde_json::Map<String, serde_json::Value> = config
                .env
                .iter()
                .map(|(k, v)| (k.clone(), serde_json::Value::String(v.clone())))
                .collect();
            map.insert("env".to_string(), serde_json::Value::Object(env));
        }
    }

    serde_json::Value::Object(map)
}

fn find_tool_config(tool_id: &str) -> Result<(PathBuf, String), String> {
    let registry = registry::get_mcp_registry();
    let def = registry
        .into_iter()
        .find(|d| d.tool_id == tool_id)
        .ok_or_else(|| format!("Tool '{}' not found in MCP registry", tool_id))?;

    let dir = (def.dir_resolver)()
        .ok_or_else(|| "Cannot determine home directory".to_string())?;

    let config_path = dir.join(def.config_filename);
    Ok((config_path, def.servers_key.to_string()))
}

#[tauri::command]
pub fn scan_mcp_tools() -> Result<Vec<McpToolInfo>, String> {
    let registry = registry::get_mcp_registry();
    let mut result = Vec::new();

    for def in registry {
        let dir = match (def.dir_resolver)() {
            Some(d) => d,
            None => continue,
        };

        let detected = dir.is_dir();
        let config_path = dir.join(def.config_filename);
        let config_exists = config_path.exists();
        let server_count = if config_exists {
            count_servers(&config_path, def.servers_key)
        } else {
            0
        };

        result.push(McpToolInfo {
            id: def.tool_id.to_string(),
            name: def.tool_name.to_string(),
            config_path: config_path.to_string_lossy().to_string(),
            detected,
            config_exists,
            server_count,
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn read_mcp_servers(tool_id: String) -> Result<Vec<McpServerEntry>, String> {
    let (config_path, servers_key) = find_tool_config(&tool_id)?;

    let json = read_json(&config_path);
    let servers_obj = match json.get(&servers_key).and_then(|v| v.as_object()) {
        Some(obj) => obj.clone(),
        None => return Ok(Vec::new()),
    };

    let entries = servers_obj
        .into_iter()
        .map(|(name, value)| json_to_server_entry(name, &value))
        .collect();

    Ok(entries)
}

#[tauri::command]
pub fn add_mcp_server(
    tool_id: String,
    name: String,
    config: McpServerConfig,
) -> Result<(), String> {
    let (config_path, servers_key) = find_tool_config(&tool_id)?;
    let mut json = read_json(&config_path);

    {
        let root = json
            .as_object_mut()
            .ok_or("Config file is not a JSON object")?;
        let servers_val = root
            .entry(servers_key)
            .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
        let servers = servers_val
            .as_object_mut()
            .ok_or("mcpServers is not a JSON object")?;

        if servers.contains_key(&name) {
            return Err(format!("Server '{}' already exists", name));
        }
        servers.insert(name, server_config_to_json(&config));
    }

    write_json(&config_path, &json)
}

#[tauri::command]
pub fn remove_mcp_server(tool_id: String, name: String) -> Result<(), String> {
    let (config_path, servers_key) = find_tool_config(&tool_id)?;
    let mut json = read_json(&config_path);

    {
        let root = json
            .as_object_mut()
            .ok_or("Config file is not a JSON object")?;
        let servers = root
            .get_mut(&servers_key)
            .and_then(|v| v.as_object_mut())
            .ok_or("No mcpServers found in config")?;

        if !servers.contains_key(&name) {
            return Err(format!("Server '{}' not found", name));
        }
        servers.remove(&name);
    }

    write_json(&config_path, &json)
}

#[tauri::command]
pub fn update_mcp_server(
    tool_id: String,
    old_name: String,
    new_name: String,
    config: McpServerConfig,
) -> Result<(), String> {
    let (config_path, servers_key) = find_tool_config(&tool_id)?;
    let mut json = read_json(&config_path);

    {
        let root = json
            .as_object_mut()
            .ok_or("Config file is not a JSON object")?;
        let servers_val = root
            .entry(servers_key)
            .or_insert_with(|| serde_json::Value::Object(serde_json::Map::new()));
        let servers = servers_val
            .as_object_mut()
            .ok_or("mcpServers is not a JSON object")?;

        if !servers.contains_key(&old_name) {
            return Err(format!("Server '{}' not found", old_name));
        }
        if old_name != new_name && servers.contains_key(&new_name) {
            return Err(format!("Server '{}' already exists", new_name));
        }
        servers.remove(&old_name);
        servers.insert(new_name, server_config_to_json(&config));
    }

    write_json(&config_path, &json)
}
