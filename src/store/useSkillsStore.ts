import { create } from "zustand";
import type { AiTool, Skill } from "../types/skills";
import * as api from "../api/skills";

interface SkillsStore {
  tools: AiTool[];
  hubSkills: Skill[];
  loading: boolean;
  error: string | null;

  fetchTools: () => Promise<void>;
  fetchHubSkills: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
  tools: [],
  hubSkills: [],
  loading: false,
  error: null,

  fetchTools: async () => {
    set({ loading: true, error: null });
    try {
      const tools = await api.scanAiTools();
      set({ tools, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchHubSkills: async () => {
    try {
      const hubSkills = await api.getHubSkills();
      set({ hubSkills });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  refreshAll: async () => {
    const { fetchTools, fetchHubSkills } = get();
    await Promise.all([fetchTools(), fetchHubSkills()]);
  },
}));
