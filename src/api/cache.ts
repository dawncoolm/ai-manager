import type { ToolCacheInfo, ClearCacheResult } from "../types/cache";
import { tauriInvoke } from "./invoke";

export async function getCacheInfo(): Promise<ToolCacheInfo[]> {
  return tauriInvoke<ToolCacheInfo[]>("get_cache_info");
}

export async function clearToolCache(toolId: string): Promise<ClearCacheResult> {
  return tauriInvoke<ClearCacheResult>("clear_tool_cache", { toolId });
}

export async function clearAllCaches(): Promise<ClearCacheResult> {
  return tauriInvoke<ClearCacheResult>("clear_all_caches");
}
