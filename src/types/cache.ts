export interface CachePathInfo {
  label: string;
  full_path: string;
  size_bytes: number;
  exists: boolean;
}

export interface ToolCacheInfo {
  tool_id: string;
  tool_name: string;
  cache_size_bytes: number;
  cache_paths: CachePathInfo[];
  has_cache: boolean;
}

export interface ClearCacheResult {
  freed_bytes: number;
  errors: string[];
}
