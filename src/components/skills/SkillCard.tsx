import { useNavigate } from "react-router-dom";
import { Link2, FileText, ChevronRight } from "lucide-react";
import type { Skill } from "../../types/skills";
import Badge from "../ui/Badge";

interface SkillCardProps {
  skill: Skill;
  toolId?: string;
  basePath?: string;
}

export default function SkillCard({
  skill,
  toolId,
  basePath,
}: SkillCardProps) {
  const navigate = useNavigate();

  const detailPath = basePath
    ? `${basePath}/${skill.dir_name}`
    : toolId
      ? `/skills/tools/${toolId}/${skill.dir_name}`
      : `/skills/hub/${skill.dir_name}`;

  return (
    <button
      onClick={() => navigate(detailPath)}
      className="group flex w-full items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-200 hover:shadow-sm"
    >
      <div className="mt-0.5 rounded-lg bg-indigo-50 p-2">
        <FileText className="h-4 w-4 text-indigo-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {skill.name}
          </span>
          {skill.is_symlink && (
            <span title="Symlink from Hub"><Link2 className="h-3 w-3 text-gray-400" /></span>
          )}
        </div>

        {skill.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            {skill.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {skill.disabled && <Badge variant="warning">Disabled</Badge>}
          {skill.has_references && <Badge variant="muted">refs</Badge>}
          {skill.has_agents && <Badge variant="muted">agents</Badge>}
          {skill.has_scripts && <Badge variant="muted">scripts</Badge>}
          {skill.installed_in.length > 0 && (
            <Badge variant="info">
              {skill.installed_in.length} tool{skill.installed_in.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </div>

      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-indigo-400" />
    </button>
  );
}
