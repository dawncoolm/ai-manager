import { useEffect } from "react";
import { useSkillsStore } from "../store/useSkillsStore";

export function useAiTools() {
  const { tools, loading, error, fetchTools } = useSkillsStore();

  useEffect(() => {
    if (tools.length === 0 && !loading) {
      fetchTools();
    }
  }, []);

  return { tools, loading, error, refetch: fetchTools };
}
