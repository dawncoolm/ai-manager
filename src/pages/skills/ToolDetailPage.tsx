import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAiTools } from "../../hooks/useAiTools";
import { useSkills } from "../../hooks/useSkills";
import SkillCard from "../../components/skills/SkillCard";
import SkillActions from "../../components/skills/SkillActions";
import ConfigViewer from "../../components/skills/ConfigViewer";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Badge from "../../components/ui/Badge";
import { useState } from "react";
import SearchInput from "../../components/ui/SearchInput";

export default function ToolDetailPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();
  const { tools } = useAiTools();
  const { skills, loading, error, refetch } = useSkills(toolId);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"skills" | "config">("skills");

  const tool = tools.find((t) => t.id === toolId);

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/skills")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tools
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tool?.name || toolId}
          </h1>
          {tool && (
            <p className="mt-1 text-xs text-gray-400">{tool.config_dir}</p>
          )}
        </div>
        <Badge variant="success">{skills.length} skills</Badge>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("skills")}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "skills"
              ? "border-indigo-500 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Skills
        </button>
        <button
          onClick={() => setTab("config")}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "config"
              ? "border-indigo-500 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Config Files
        </button>
      </div>

      {tab === "skills" && (
        <div className="mt-6">
          <div className="mb-4 w-64">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search skills..."
            />
          </div>

          {loading && <LoadingSpinner text="Loading skills..." />}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <EmptyState
              title="No skills installed"
              description="Install skills from the Skills Hub"
            />
          )}

          <div className="space-y-3">
            {filtered.map((skill) => (
              <div
                key={skill.dir_name}
                className={`flex items-start gap-2 ${skill.disabled ? "opacity-50" : ""}`}
              >
                <div className="flex-1">
                  <SkillCard skill={skill} toolId={toolId} />
                </div>
                <div className="pt-3">
                  <SkillActions
                    toolId={toolId!}
                    skillName={skill.dir_name}
                    isSymlink={skill.is_symlink}
                    disabled={skill.disabled}
                    onComplete={refetch}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "config" && tool && (
        <div className="mt-6">
          <ConfigViewer configFiles={tool.config_files} />
        </div>
      )}
    </div>
  );
}
