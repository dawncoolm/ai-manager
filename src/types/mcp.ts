export interface McpToolInfo {
  id: string;
  name: string;
  config_path: string;
  detected: boolean;
  config_exists: boolean;
  server_count: number;
}

export interface McpServerEntry {
  name: string;
  server_type: "stdio" | "http";
  command?: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  headers: Record<string, string>;
}

export interface McpServerConfig {
  server_type: "stdio" | "http";
  command?: string;
  args: string[];
  env: Record<string, string>;
  url?: string;
  headers: Record<string, string>;
}
