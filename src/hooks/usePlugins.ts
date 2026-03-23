import { useEffect } from "react";
import { usePluginsStore } from "../store/usePluginsStore";

export function usePlugins() {
  const { plugins, marketplaces, loading, error, fetchPlugins, fetchMarketplaces } =
    usePluginsStore();

  useEffect(() => {
    if (plugins.length === 0 && !loading) {
      fetchPlugins();
    }
    fetchMarketplaces();
  }, []);

  const refetch = async () => {
    await Promise.all([fetchPlugins(), fetchMarketplaces()]);
  };

  return { plugins, marketplaces, loading, error, refetch, refetchMarketplaces: fetchMarketplaces };
}
