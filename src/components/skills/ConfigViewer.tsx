import { useState, useEffect } from "react";
import { FileCode } from "lucide-react";
import type { ConfigFile } from "../../types/skills";
import * as api from "../../api/skills";

interface ConfigViewerProps {
  configFiles: ConfigFile[];
}

export default function ConfigViewer({ configFiles }: ConfigViewerProps) {
  const [selected, setSelected] = useState<ConfigFile | null>(
    configFiles[0] || null
  );
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api
      .readConfigFile(selected.path)
      .then(setContent)
      .catch((e) => setContent(`Error: ${e}`))
      .finally(() => setLoading(false));
  }, [selected]);

  if (configFiles.length === 0) {
    return (
      <p className="text-sm text-gray-400">No config files found.</p>
    );
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200">
        {configFiles.map((f) => (
          <button
            key={f.path}
            onClick={() => setSelected(f)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              selected?.path === f.path
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileCode className="h-3 w-3" />
            {f.name}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-[400px] overflow-auto rounded-lg bg-gray-900 p-4">
        {loading ? (
          <p className="text-xs text-gray-500">Loading...</p>
        ) : (
          <pre className="text-xs leading-relaxed text-gray-100 whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
