import { useState } from "react";
import { X, Download } from "lucide-react";
import type { AiTool } from "../../types/skills";
import * as api from "../../api/skills";

interface InstallDialogProps {
  skillName: string;
  tools: AiTool[];
  installedIn: string[];
  onClose: () => void;
  onComplete: () => void;
}

export default function InstallDialog({
  skillName,
  tools,
  installedIn,
  onClose,
  onComplete,
}: InstallDialogProps) {
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skillsCapableTools = tools.filter(
    (t) => t.capability === "skills" && t.detected
  );

  const handleInstall = async (toolId: string) => {
    setInstalling(toolId);
    setError(null);
    try {
      await api.installSkill(skillName, toolId);
      onComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[400px] rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Install "{skillName}"
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Select which tools to install this skill to:
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {skillsCapableTools.map((tool) => {
            const isInstalled = installedIn.includes(tool.id);
            return (
              <div
                key={tool.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-700">
                  {tool.name}
                </span>
                {isInstalled ? (
                  <span className="text-xs text-emerald-600">Installed</span>
                ) : (
                  <button
                    onClick={() => handleInstall(tool.id)}
                    disabled={installing !== null}
                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    {installing === tool.id ? "Installing..." : "Install"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
