export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!(window as any).__TAURI_INTERNALS__) {
    throw new Error(`Tauri runtime not available. Please run with "bun start".`);
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}
