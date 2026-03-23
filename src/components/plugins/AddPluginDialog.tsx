import { useState } from "react";
import {
  X,
  Loader2,
  Store,
  Puzzle,
  CheckCircle2,
  XCircle,
  SkipForward,
} from "lucide-react";
import * as api from "../../api/plugins";
import type {
  MarketplaceInfo,
  MarketplaceImportResult,
} from "../../types/plugins";

interface AddPluginDialogProps {
  onClose: () => void;
  onComplete: () => void;
}

type TabId = "plugin" | "marketplace";
type MarketplaceStep = "input" | "preview" | "importing" | "results";

export default function AddPluginDialog({
  onClose,
  onComplete,
}: AddPluginDialogProps) {
  const [tab, setTab] = useState<TabId>("plugin");
  const [pluginInput, setPluginInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Marketplace state
  const [marketplaceUrl, setMarketplaceUrl] = useState("");
  const [marketplaceStep, setMarketplaceStep] =
    useState<MarketplaceStep>("input");
  const [marketplaceInfo, setMarketplaceInfo] =
    useState<MarketplaceInfo | null>(null);
  const [importResult, setImportResult] =
    useState<MarketplaceImportResult | null>(null);

  const handleAddPlugin = async () => {
    if (!pluginInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.addPlugin(pluginInput.trim());
      onComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleFetchMarketplace = async () => {
    if (!marketplaceUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const info = await api.fetchMarketplace(marketplaceUrl.trim());
      setMarketplaceInfo(info);
      setMarketplaceStep("preview");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async () => {
    setMarketplaceStep("importing");
    setError(null);
    try {
      const result = await api.importMarketplacePlugins(marketplaceUrl.trim());
      setImportResult(result);
      setMarketplaceStep("results");
    } catch (e) {
      setError(String(e));
      setMarketplaceStep("preview");
    }
  };

  const handleMarketplaceDone = () => {
    if (importResult && importResult.succeeded > 0) {
      onComplete();
    } else {
      onClose();
    }
  };

  const resetMarketplace = () => {
    setMarketplaceStep("input");
    setMarketplaceInfo(null);
    setImportResult(null);
    setError(null);
  };

  const tabs: { id: TabId; label: string; icon: typeof Puzzle }[] = [
    { id: "plugin", label: "Plugin", icon: Puzzle },
    { id: "marketplace", label: "Marketplace", icon: Store },
  ];

  const sourceTypeBadge = (type_: string) => {
    const colors: Record<string, string> = {
      local: "bg-blue-100 text-blue-700",
      github: "bg-gray-100 text-gray-700",
      url: "bg-purple-100 text-purple-700",
      "git-subdir": "bg-orange-100 text-orange-700",
      npm: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colors[type_] ?? "bg-gray-100 text-gray-500"}`}
      >
        {type_}
      </span>
    );
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "skipped":
        return <SkipForward className="h-3.5 w-3.5 text-amber-500" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className={`rounded-xl bg-white p-6 shadow-xl transition-all ${
          tab === "marketplace" &&
          (marketplaceStep === "preview" || marketplaceStep === "results")
            ? "w-[560px]"
            : "w-[460px]"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Add Plugin</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError(null);
                if (t.id === "marketplace") resetMarketplace();
              }}
              disabled={loading || marketplaceStep === "importing"}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              } disabled:opacity-50`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Plugin Tab */}
        {tab === "plugin" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Plugin Source
            </label>
            <input
              type="text"
              value={pluginInput}
              onChange={(e) => setPluginInput(e.target.value)}
              placeholder="owner/repo or D:\plugins\my-plugin"
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddPlugin()}
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Enter a GitHub repo (owner/repo) or local directory path
            </p>
          </div>
        )}

        {/* Marketplace Tab */}
        {tab === "marketplace" && (
          <div className="mt-4">
            {/* Step 1: Input */}
            {marketplaceStep === "input" && (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  Marketplace Source
                </label>
                <input
                  type="text"
                  value={marketplaceUrl}
                  onChange={(e) => setMarketplaceUrl(e.target.value)}
                  placeholder="owner/repo or D:\path\to\marketplace"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleFetchMarketplace()
                  }
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Local path or GitHub repo containing
                  .claude-plugin/marketplace.json
                </p>
              </>
            )}

            {/* Step 2: Preview */}
            {marketplaceStep === "preview" && marketplaceInfo && (
              <>
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-violet-900">
                        {marketplaceInfo.name}
                      </p>
                      <p className="text-xs text-violet-600">
                        by {marketplaceInfo.owner_name}
                      </p>
                    </div>
                    <span className="rounded-full bg-violet-200 px-2 py-0.5 text-xs font-medium text-violet-800">
                      {marketplaceInfo.plugins.length} plugins
                    </span>
                  </div>
                  {marketplaceInfo.description && (
                    <p className="mt-1.5 text-xs text-violet-700">
                      {marketplaceInfo.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 max-h-[240px] space-y-1.5 overflow-y-auto">
                  {marketplaceInfo.plugins.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-gray-900">
                            {p.name}
                          </span>
                          {sourceTypeBadge(p.source_type)}
                          {p.already_added && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                              added
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {p.description}
                          </p>
                        )}
                      </div>
                      {p.version && (
                        <span className="shrink-0 text-xs text-gray-400">
                          v{p.version}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    resetMarketplace();
                    setMarketplaceUrl("");
                  }}
                  className="mt-2 text-xs text-violet-600 hover:text-violet-800"
                >
                  Change marketplace
                </button>
              </>
            )}

            {/* Step 3: Importing */}
            {marketplaceStep === "importing" && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="mt-3 text-sm text-gray-600">
                  Importing plugins...
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  This may take a while for GitHub plugins
                </p>
              </div>
            )}

            {/* Step 4: Results */}
            {marketplaceStep === "results" && importResult && (
              <>
                <div className="flex gap-3">
                  {importResult.succeeded > 0 && (
                    <div className="flex-1 rounded-lg bg-green-50 p-2.5 text-center">
                      <p className="text-lg font-bold text-green-700">
                        {importResult.succeeded}
                      </p>
                      <p className="text-[10px] text-green-600">imported</p>
                    </div>
                  )}
                  {importResult.skipped > 0 && (
                    <div className="flex-1 rounded-lg bg-amber-50 p-2.5 text-center">
                      <p className="text-lg font-bold text-amber-700">
                        {importResult.skipped}
                      </p>
                      <p className="text-[10px] text-amber-600">skipped</p>
                    </div>
                  )}
                  {importResult.failed > 0 && (
                    <div className="flex-1 rounded-lg bg-red-50 p-2.5 text-center">
                      <p className="text-lg font-bold text-red-700">
                        {importResult.failed}
                      </p>
                      <p className="text-[10px] text-red-600">failed</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 max-h-[200px] space-y-1 overflow-y-auto">
                  {importResult.results.map((r) => (
                    <div
                      key={r.plugin_name}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    >
                      {statusIcon(r.status)}
                      <span className="text-sm text-gray-800">
                        {r.plugin_name}
                      </span>
                      {r.message && (
                        <span className="truncate text-xs text-gray-400">
                          {r.message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          {tab === "plugin" && (
            <button
              onClick={handleAddPlugin}
              disabled={loading || !pluginInput.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Adding..." : "Add Plugin"}
            </button>
          )}

          {tab === "marketplace" && marketplaceStep === "input" && (
            <button
              onClick={handleFetchMarketplace}
              disabled={loading || !marketplaceUrl.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loading ? "Fetching..." : "Fetch Marketplace"}
            </button>
          )}

          {tab === "marketplace" && marketplaceStep === "preview" && (
            <button
              onClick={handleImportAll}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Store className="h-3.5 w-3.5" />
              Import All Plugins
            </button>
          )}

          {tab === "marketplace" && marketplaceStep === "results" && (
            <button
              onClick={handleMarketplaceDone}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
