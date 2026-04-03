import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Server, Globe } from "lucide-react";
import {
  scanMcpTools,
  readMcpServers,
  addMcpServer,
  removeMcpServer,
  updateMcpServer,
} from "../../api/mcp";
import type { McpToolInfo, McpServerEntry, McpServerConfig } from "../../types/mcp";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function McpToolDetailPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const navigate = useNavigate();

  const [tool, setTool] = useState<McpToolInfo | null>(null);
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!toolId) return;
    try {
      const [allTools, serverList] = await Promise.all([
        scanMcpTools(),
        readMcpServers(toolId),
      ]);
      setTool(allTools.find((t) => t.id === toolId) ?? null);
      setServers(serverList);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = () => {
    setEditingServer(null);
    setDialogOpen(true);
  };

  const handleEdit = (server: McpServerEntry) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!toolId || !confirmDelete) return;
    setSaving(true);
    try {
      await removeMcpServer(toolId, confirmDelete);
      setConfirmDelete(null);
      await loadData();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (name: string, config: McpServerConfig) => {
    if (!toolId) return;
    setSaving(true);
    try {
      if (editingServer) {
        await updateMcpServer(toolId, editingServer.name, name, config);
      } else {
        await addMcpServer(toolId, name, config);
      }
      setDialogOpen(false);
      setEditingServer(null);
      await loadData();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading MCP servers..." />;

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/mcp")}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        MCP Servers
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tool?.name ?? toolId}
          </h1>
          {tool && (
            <p className="mt-1 font-mono text-xs text-gray-400">
              {tool.config_path}
            </p>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Server
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-8">
        {servers.length === 0 ? (
          <EmptyState
            title="No MCP servers configured"
            description="Add a server to get started"
          >
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add Server
            </button>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <ServerRow
                key={server.name}
                server={server}
                onEdit={() => handleEdit(server)}
                onDelete={() => setConfirmDelete(server.name)}
              />
            ))}
          </div>
        )}
      </div>

      {dialogOpen && (
        <ServerDialog
          initial={editingServer}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setDialogOpen(false);
            setEditingServer(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remove MCP Server"
          message={`Remove "${confirmDelete}" from ${tool?.name ?? toolId}?`}
          confirmLabel="Remove"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ServerRow({
  server,
  onEdit,
  onDelete,
}: {
  server: McpServerEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isHttp = server.server_type === "http";

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="rounded-lg bg-gray-50 p-2">
          {isHttp ? (
            <Globe className="h-4 w-4 text-gray-500" />
          ) : (
            <Server className="h-4 w-4 text-gray-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{server.name}</p>
            <Badge variant={isHttp ? "success" : "info"}>
              {server.server_type}
            </Badge>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
            {isHttp ? server.url : server.command}
            {!isHttp && server.args.length > 0 && (
              <span className="ml-1 text-gray-300">
                {server.args.join(" ")}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 ml-4">
        <button
          onClick={onEdit}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ServerDialog({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: McpServerEntry | null;
  saving: boolean;
  onSave: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [serverType, setServerType] = useState<"stdio" | "http">(
    initial?.server_type ?? "stdio"
  );
  const [command, setCommand] = useState(initial?.command ?? "");
  const [argsText, setArgsText] = useState(
    initial?.args.join("\n") ?? ""
  );
  const [envText, setEnvText] = useState(
    initial
      ? Object.entries(initial.env)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")
      : ""
  );
  const [url, setUrl] = useState(initial?.url ?? "");
  const [headersText, setHeadersText] = useState(
    initial
      ? Object.entries(initial.headers)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")
      : ""
  );
  const [formError, setFormError] = useState<string | null>(null);

  function parseKeyValue(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const idx = line.indexOf("=");
        if (idx > 0) {
          result[line.slice(0, idx).trim()] = line.slice(idx + 1);
        }
      });
    return result;
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Server name is required");
      return;
    }
    if (serverType === "stdio" && !command.trim()) {
      setFormError("Command is required for stdio servers");
      return;
    }
    if (serverType === "http" && !url.trim()) {
      setFormError("URL is required for HTTP servers");
      return;
    }

    const config: McpServerConfig = {
      server_type: serverType,
      command: serverType === "stdio" ? command.trim() : undefined,
      args:
        serverType === "stdio"
          ? argsText
              .split("\n")
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
      env: serverType === "stdio" ? parseKeyValue(envText) : {},
      url: serverType === "http" ? url.trim() : undefined,
      headers: serverType === "http" ? parseKeyValue(headersText) : {},
    };

    onSave(trimmedName, config);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">
          {initial ? "Edit Server" : "Add MCP Server"}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">
              Server Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. filesystem"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">
              Type
            </label>
            <div className="mt-1 flex gap-2">
              {(["stdio", "http"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setServerType(t)}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                    serverType === t
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {serverType === "stdio" ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Command
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g. npx"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Args{" "}
                  <span className="font-normal text-gray-400">
                    (one per line)
                  </span>
                </label>
                <textarea
                  value={argsText}
                  onChange={(e) => setArgsText(e.target.value)}
                  placeholder={"-y\n@modelcontextprotocol/server-filesystem\n/path/to/dir"}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Env{" "}
                  <span className="font-normal text-gray-400">
                    (KEY=value, one per line)
                  </span>
                </label>
                <textarea
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  placeholder="API_KEY=secret"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Headers{" "}
                  <span className="font-normal text-gray-400">
                    (KEY=value, one per line)
                  </span>
                </label>
                <textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  placeholder="Authorization=Bearer token"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : initial ? "Save Changes" : "Add Server"}
          </button>
        </div>
      </div>
    </div>
  );
}
