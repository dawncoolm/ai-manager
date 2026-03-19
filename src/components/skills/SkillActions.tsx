import { Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import * as api from "../../api/skills";

interface SkillActionsProps {
  toolId: string;
  skillName: string;
  isSymlink: boolean;
  disabled: boolean;
  onComplete: () => void;
}

export default function SkillActions({
  toolId,
  skillName,
  isSymlink,
  disabled,
  onComplete,
}: SkillActionsProps) {
  const handleRemove = async () => {
    if (!confirm(`Remove skill "${skillName}" from ${toolId}?`)) return;
    try {
      await api.removeSkill(toolId, skillName);
      onComplete();
    } catch (e) {
      alert(String(e));
    }
  };

  const handleToggle = async () => {
    try {
      await api.toggleSkill(toolId, skillName, disabled);
      onComplete();
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs ${
          disabled
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        title={disabled ? "Enable skill" : "Disable skill"}
      >
        {disabled ? (
          <>
            <ToggleRight className="h-3.5 w-3.5" />
            Enable
          </>
        ) : (
          <>
            <ToggleLeft className="h-3.5 w-3.5" />
            Disable
          </>
        )}
      </button>
      <button
        onClick={handleRemove}
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
        title={isSymlink ? "Remove symlink" : "Delete skill"}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isSymlink ? "Unlink" : "Remove"}
      </button>
    </div>
  );
}
