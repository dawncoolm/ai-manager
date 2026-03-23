export interface PluginMetadata {
  name: string;
  description: string;
  version: string;
  author: string | null;
  license: string | null;
  keywords: string[] | null;
  repository: string | null;
}

export type PluginSource =
  | { type: "Local"; path: string }
  | { type: "GitHub"; owner: string; repo: string };

export interface PluginEntry {
  id: string;
  source: PluginSource;
  local_path: string;
  metadata: PluginMetadata;
  added_at: string;
  marketplace_id?: string;
}

export interface PluginContents {
  skills: PluginSkillInfo[];
  commands: PluginCommandInfo[];
}

export interface PluginSkillInfo {
  dir_name: string;
  name: string;
  description: string;
  skill_path: string;
  installed_in: string[];
}

export interface PluginCommandInfo {
  file_name: string;
  command_name: string;
  file_path: string;
  installed_in: string[];
}

// ── Marketplace types ──

export interface MarketplaceInfo {
  name: string;
  owner_name: string;
  description: string | null;
  plugins: MarketplacePluginPreview[];
}

export interface MarketplacePluginPreview {
  name: string;
  description: string | null;
  version: string | null;
  source_type: string;
  already_added: boolean;
}

export interface MarketplaceImportResult {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: PluginImportStatus[];
}

export interface PluginImportStatus {
  plugin_name: string;
  status: "success" | "skipped" | "failed";
  message: string | null;
}

export interface MarketplaceEntry {
  id: string;
  url: string;
  name: string;
  owner_name: string;
  plugin_count: number;
  added_at: string;
}
