import { useState } from "react";
import { useAiTools } from "../../hooks/useAiTools";
import ToolCard from "../../components/skills/ToolCard";
import SearchInput from "../../components/ui/SearchInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function SkillsDashboard() {
  const { tools, loading, error } = useAiTools();
  const [search, setSearch] = useState("");

  const detected = tools.filter((t) => t.detected);
  const filtered = detected.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  const skillsTools = filtered.filter((t) => t.capability === "skills");
  const configTools = filtered.filter((t) => t.capability !== "skills");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Skills</h1>
          <p className="mt-1 text-sm text-gray-500">
            {detected.length} tools detected on your machine
          </p>
        </div>
        <div className="w-64">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tools..."
          />
        </div>
      </div>

      {loading && <LoadingSpinner text="Scanning AI tools..." />}

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {skillsTools.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                With Skills System
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {skillsTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}

          {configTools.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Config Only
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {configTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="mt-12 text-center text-sm text-gray-400">
              No AI tools found matching "{search}"
            </div>
          )}
        </>
      )}
    </div>
  );
}
