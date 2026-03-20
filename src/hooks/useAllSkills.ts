import { useState, useEffect, useCallback } from "react";
import type { SkillGroup } from "../types/skills";
import * as api from "../api/skills";

export function useAllSkills() {
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listAllSkills();
      setGroups(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { groups, loading, error, refetch: fetch };
}
