import type {
  AiTool,
  Skill,
  SkillContent,
  EditorInfo,
  SkillGroup,
  Command,
} from "../types/skills";
import { tauriInvoke } from "./invoke";

export async function scanAiTools(): Promise<AiTool[]> {
  return tauriInvoke<AiTool[]>("scan_ai_tools");
}

export async function listSkills(toolId: string): Promise<Skill[]> {
  return tauriInvoke<Skill[]>("list_skills", { toolId });
}

export async function listCommands(toolId: string): Promise<Command[]> {
  return tauriInvoke<Command[]>("list_commands", { toolId });
}

export async function listAllSkills(): Promise<SkillGroup[]> {
  return tauriInvoke<SkillGroup[]>("list_all_skills");
}

export async function readSkill(skillPath: string): Promise<SkillContent> {
  return tauriInvoke<SkillContent>("read_skill", { skillPath });
}

export async function getHubSkills(): Promise<Skill[]> {
  return tauriInvoke<Skill[]>("get_hub_skills");
}

export async function installSkill(
  hubSkillName: string,
  toolId: string
): Promise<void> {
  return tauriInvoke("install_skill", { hubSkillName, toolId });
}

export async function removeSkill(
  toolId: string,
  skillName: string
): Promise<void> {
  return tauriInvoke("remove_skill", { toolId, skillName });
}

export async function removeSkillFromAll(skillName: string): Promise<void> {
  return tauriInvoke("remove_skill_from_all", { skillName });
}

export async function toggleSkill(
  toolId: string,
  skillName: string,
  enabled: boolean
): Promise<void> {
  return tauriInvoke("toggle_skill", { toolId, skillName, enabled });
}

export async function readConfigFile(filePath: string): Promise<string> {
  return tauriInvoke<string>("read_config_file", { filePath });
}

export async function readCommandFile(filePath: string): Promise<string> {
  return tauriInvoke<string>("read_command_file", { filePath });
}

export async function detectEditors(): Promise<EditorInfo[]> {
  return tauriInvoke<EditorInfo[]>("detect_editors");
}

export async function openInEditor(
  filePath: string,
  editor: string
): Promise<void> {
  return tauriInvoke("open_in_editor", { filePath, editor });
}

export async function removeCommand(
  toolId: string,
  commandFile: string
): Promise<void> {
  return tauriInvoke("remove_command", { toolId, commandFile });
}
