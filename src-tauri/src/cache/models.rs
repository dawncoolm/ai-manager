use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ToolCacheInfo {
    pub tool_id: String,
    pub tool_name: String,
    pub cache_size_bytes: u64,
    pub cache_paths: Vec<CachePathInfo>,
    pub has_cache: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct CachePathInfo {
    pub label: String,
    pub full_path: String,
    pub size_bytes: u64,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClearCacheResult {
    pub freed_bytes: u64,
    pub errors: Vec<String>,
}
