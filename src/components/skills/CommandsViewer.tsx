import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Link2,
  Terminal,
  Trash2,
} from "lucide-react";
import type { Command } from "../../types/skills";
import { useEditorPreference } from "../../hooks/useEditorPreference";
import * as api from "../../api/skills";
import Badge from "../ui/Badge";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../ui/LoadingSpinner";
import SearchInput from "../ui/SearchInput";

interface CommandsViewerProps {
  toolId: string;
  commands: Command[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

export default function CommandsViewer({
  toolId,
  commands,
  loading,
  error,
  onRefresh,
}: CommandsViewerProps) {
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [content, setContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [removing, setRemoving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { editors, editor, setEditor, loading: editorsLoading } =
    useEditorPreference();

  const normalizedSearch = search.toLowerCase();
  const filteredCommands = commands.filter(
    (command) =>
      command.command_name.toLowerCase().includes(normalizedSearch) ||
      command.file_name.toLowerCase().includes(normalizedSearch)
  );

  useEffect(() => {
    const visibleCommands = commands.filter(
      (command) =>
        command.command_name.toLowerCase().includes(normalizedSearch) ||
        command.file_name.toLowerCase().includes(normalizedSearch)
    );

    if (visibleCommands.length === 0) {
      if (selectedPath) {
        setSelectedPath("");
      }
      return;
    }

    if (!visibleCommands.some((command) => command.file_path === selectedPath)) {
      setSelectedPath(visibleCommands[0].file_path);
    }
  }, [commands, normalizedSearch, selectedPath]);

  const selectedCommand =
    filteredCommands.find((command) => command.file_path === selectedPath) ?? null;

  useEffect(() => {
    if (!selectedCommand) {
      setContent("");
      return;
    }

    setContentLoading(true);
    api
      .readCommandFile(selectedCommand.file_path)
      .then(setContent)
      .catch((readError) => setContent(`Error: ${readError}`))
      .finally(() => setContentLoading(false));
  }, [selectedCommand]);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const currentEditor = editors.find((item) => item.id === editor);
  const showEditorButton =
    !editorsLoading && editors.length > 0 && Boolean(selectedCommand);

  const handleOpenInEditor = async () => {
    if (!selectedCommand || !editor) {
      return;
    }

    setOpening(true);
    setActionError(null);
    try {
      await api.openInEditor(selectedCommand.file_path, editor);
    } catch (openError) {
      setActionError(String(openError));
    } finally {
      setOpening(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedCommand) {
      return;
    }

    const confirmed = confirm(
      `Remove command "/${selectedCommand.command_name}" from this tool?`
    );
    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setActionError(null);
    try {
      await api.removeCommand(toolId, selectedCommand.file_name);
      await onRefresh();
    } catch (removeError) {
      setActionError(String(removeError));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading commands..." />;
  }

  if (commands.length === 0) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        <EmptyState
          title="No commands installed"
          description="This AI tool does not currently have any command files."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full max-w-xs">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search commands..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showEditorButton && (
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-stretch">
                <button
                  onClick={handleOpenInEditor}
                  disabled={!selectedCommand || opening || removing}
                  className="flex items-center gap-1.5 rounded-l-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  {opening
                    ? "Opening..."
                    : `Open in ${currentEditor?.label ?? editor}`}
                </button>
                <button
                  onClick={() => setDropdownOpen((current) => !current)}
                  className="flex items-center rounded-r-md border-l border-indigo-500 bg-indigo-600 px-1.5 text-white hover:bg-indigo-700"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {editors.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setEditor(item.id);
                        setDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      {item.label}
                      {editor === item.id && (
                        <Check className="h-3 w-3 text-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleRemove}
            disabled={!selectedCommand || removing || opening}
            className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            {removing ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,minmax(0,1fr)]">
        <div className="rounded-xl border border-gray-200 bg-white p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-400">
              No commands matching "{search}"
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCommands.map((command) => {
                const selected = command.file_path === selectedCommand?.file_path;
                return (
                  <button
                    key={command.file_path}
                    onClick={() => setSelectedPath(command.file_path)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-indigo-500" />
                      <span className="truncate text-sm font-medium text-gray-900">
                        /{command.command_name}
                      </span>
                      {command.is_symlink && <Badge variant="muted">Symlink</Badge>}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {command.file_name}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {selectedCommand ? (
            <>
              <div className="border-b border-gray-200 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    /{selectedCommand.command_name}
                  </h3>
                  {selectedCommand.is_symlink && (
                    <Badge variant="muted">Symlink</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {selectedCommand.file_name}
                </p>
                {selectedCommand.symlink_target && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-400">
                    <Link2 className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span className="break-all">
                      {selectedCommand.symlink_target}
                    </span>
                  </div>
                )}
              </div>

              <div className="max-h-[420px] overflow-auto bg-gray-900 p-4">
                {contentLoading ? (
                  <p className="text-xs text-gray-500">Loading...</p>
                ) : (
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-100">
                    {content}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center px-6 text-sm text-gray-400">
              Select a command to preview its content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
