import { tauriInvoke } from "./invoke";
import type { McpToolInfo, McpServerEntry, McpServerConfig } from "../types/mcp";

export const scanMcpTools = () =>
  tauriInvoke<McpToolInfo[]>("scan_mcp_tools");

export const readMcpServers = (toolId: string) =>
  tauriInvoke<McpServerEntry[]>("read_mcp_servers", { toolId });

export const addMcpServer = (
  toolId: string,
  name: string,
  config: McpServerConfig
) => tauriInvoke<void>("add_mcp_server", { toolId, name, config });

export const removeMcpServer = (toolId: string, name: string) =>
  tauriInvoke<void>("remove_mcp_server", { toolId, name });

export const updateMcpServer = (
  toolId: string,
  oldName: string,
  newName: string,
  config: McpServerConfig
) => tauriInvoke<void>("update_mcp_server", { toolId, oldName, newName, config });
