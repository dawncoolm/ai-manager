import { create } from "zustand";
import type { PluginEntry, MarketplaceEntry } from "../types/plugins";
import * as api from "../api/plugins";

interface PluginsStore {
  plugins: PluginEntry[];
  marketplaces: MarketplaceEntry[];
  loading: boolean;
  error: string | null;

  fetchPlugins: () => Promise<void>;
  fetchMarketplaces: () => Promise<void>;
}

export const usePluginsStore = create<PluginsStore>((set) => ({
  plugins: [],
  marketplaces: [],
  loading: false,
  error: null,

  fetchPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const plugins = await api.listPlugins();
      set({ plugins, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchMarketplaces: async () => {
    try {
      const marketplaces = await api.listMarketplaces();
      set({ marketplaces });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
