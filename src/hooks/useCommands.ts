import { useCallback, useEffect, useState } from "react";
import type { Command } from "../types/skills";
import * as api from "../api/skills";

export function useCommands(toolId: string | undefined) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!toolId) {
      setCommands([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.listCommands(toolId);
      setCommands(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { commands, loading, error, refetch: fetch };
}
