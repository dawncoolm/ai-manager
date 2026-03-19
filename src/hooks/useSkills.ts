import { useState, useEffect, useCallback } from "react";
import type { Skill } from "../types/skills";
import * as api from "../api/skills";

export function useSkills(toolId: string | undefined) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!toolId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.listSkills(toolId);
      setSkills(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { skills, loading, error, refetch: fetch };
}
