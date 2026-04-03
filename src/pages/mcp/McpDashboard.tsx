import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plug, Server } from "lucide-react";
import { scanMcpTools } from "../../api/mcp";
import type { McpToolInfo } from "../../types/mcp";
import Badge from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import SearchInput from "../../components/ui/SearchInput";

export default function McpDashboard() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    scanMcpTools()
      .then(setTools)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const detected = tools.filter((t) => t.detected);
  const undetected = tools.filter((t) => !t.detected);

  const filtered = detected.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {detected.length} tools with MCP support detected
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

      {loading && <LoadingSpinner text="Scanning MCP tools..." />}

      {error && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {filtered.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
                Detected
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {filtered.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onClick={() => navigate(`/mcp/${tool.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {undetected.length > 0 && !search && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
                Not Installed
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {undetected.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && search && (
            <div className="mt-12 text-center text-sm text-gray-400">
              No tools found matching "{search}"
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToolCard({
  tool,
  onClick,
}: {
  tool: McpToolInfo;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left transition-shadow ${
        onClick
          ? "cursor-pointer hover:shadow-md"
          : "cursor-default opacity-50"
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <div className="rounded-lg bg-emerald-50 p-2">
          <Plug className="h-5 w-5 text-emerald-600" />
        </div>
        {tool.detected && (
          <Badge variant={tool.server_count > 0 ? "info" : "muted"}>
            {tool.server_count === 0
              ? "No servers"
              : `${tool.server_count} server${tool.server_count === 1 ? "" : "s"}`}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-900">{tool.name}</p>
      {tool.detected ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Server className="h-3 w-3 text-gray-400" />
          <p className="line-clamp-1 font-mono text-xs text-gray-400">
            {tool.config_path}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-xs text-gray-400">Not installed</p>
      )}
    </button>
  );
}
