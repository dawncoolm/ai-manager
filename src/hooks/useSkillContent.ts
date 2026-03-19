import { useState, useEffect, useCallback } from "react";
import type { SkillContent } from "../types/skills";
import * as api from "../api/skills";

export function useSkillContent(skillPath: string | undefined) {
  const [content, setContent] = useState<SkillContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!skillPath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.readSkill(skillPath);
      setContent(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [skillPath]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { content, loading, error, refetch: fetch };
}
