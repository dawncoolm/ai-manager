import { useState, useEffect, useCallback } from "react";
import type { ToolCacheInfo } from "../types/cache";
import * as api from "../api/cache";

export function useCacheInfo() {
  const [cacheInfos, setCacheInfos] = useState<ToolCacheInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCacheInfo();
      setCacheInfos(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { cacheInfos, loading, error, refetch: fetch };
}
