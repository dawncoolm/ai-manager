import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Link2,
  Trash2,
} from "lucide-react";
import { useAllSkills } from "../../hooks/useAllSkills";
import * as api from "../../api/skills";
import SkillActions from "../../components/skills/SkillActions";
import SearchInput from "../../components/ui/SearchInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";

export default function BySkillPage() {
  const { groups, loading, error, refetch } = useAllSkills();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggleExpand = (dirName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirName)) next.delete(dirName);
      else next.add(dirName);
      return next;
    });
  };

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.dir_name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.tools.some((t) => t.tool_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">By Skill</h1>
          <p className="mt-1 text-sm text-gray-500">
            {groups.length} skills across all tools
          </p>
        </div>
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search skills or tools..."
          />
        </div>
      </div>

      {loading && <LoadingSpinner text="Scanning all skills..." />}

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          title="No skills found"
          description={
            search
              ? `No skills matching "${search}"`
              : "No skills installed in any tool"
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((group) => {
            const isExpanded = expanded.has(group.dir_name);
            const enabledCount = group.tools.filter((t) => !t.disabled).length;
            const disabledCount = group.tools.length - enabledCount;

            return (
              <div
                key={group.dir_name}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                {/* Group header */}
                <button
                  onClick={() => toggleExpand(group.dir_name)}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-8 items-center text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>

                  <div className="rounded-lg bg-indigo-50 p-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {group.name}
                      </span>
                    </div>
                    {group.description && (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {group.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="info">
                        {group.tools.length} tool
                        {group.tools.length > 1 ? "s" : ""}
                      </Badge>
                      {disabledCount > 0 && (
                        <Badge variant="warning">
                          {disabledCount} disabled
                        </Badge>
                      )}
                      {group.has_references && (
                        <Badge variant="muted">refs</Badge>
                      )}
                      {group.has_agents && (
                        <Badge variant="muted">agents</Badge>
                      )}
                      {group.has_scripts && (
                        <Badge variant="muted">scripts</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        const firstTool = group.tools[0];
                        if (firstTool) {
                          navigate(
                            `/skills/tools/${firstTool.tool_id}/${group.dir_name}`
                          );
                        }
                      }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline"
                    >
                      Detail
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          !confirm(
                            `Remove skill "${group.name}" from all ${group.tools.length} tool(s)?`
                          )
                        )
                          return;
                        try {
                          await api.removeSkillFromAll(group.dir_name);
                          refetch();
                        } catch (err) {
                          alert(String(err));
                        }
                      }}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      title="Remove from all tools"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove All
                    </button>
                  </div>
                </button>

                {/* Expanded: tool entries */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {group.tools.map((entry) => (
                      <div
                        key={entry.tool_id}
                        className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
                          entry.disabled ? "opacity-50" : ""
                        }`}
                      >
                        <div className="ml-7 flex min-w-0 flex-1 items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">
                            {entry.tool_name}
                          </span>
                          {entry.is_symlink && (
                            <span title="Symlink from Hub">
                              <Link2 className="h-3 w-3 text-gray-400" />
                            </span>
                          )}
                          {entry.disabled && (
                            <Badge variant="warning">Disabled</Badge>
                          )}
                        </div>
                        <SkillActions
                          toolId={entry.tool_id}
                          skillName={group.dir_name}
                          isSymlink={entry.is_symlink}
                          disabled={entry.disabled}
                          onComplete={refetch}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
