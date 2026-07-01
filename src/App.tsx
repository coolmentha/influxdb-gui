import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectionForm } from "@/components/connections/connection-form";
import { ObjectTree } from "@/components/object-tree/object-tree";
import { QueryEditor } from "@/components/query/query-editor";
import { useConnectionStore } from "@/stores/connection-store";
import { useQueryStore } from "@/stores/query-store";
import { useSecretStore } from "@/stores/secret-store";
import { useThemeStore } from "@/stores/theme-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useErrorLogStore } from "@/stores/error-log-store";
import { ErrorLogPanel } from "@/components/error-log/error-log-panel";
import { appErrorMessage, type AppError } from "@/lib/types";
import { Plus, Database as DatabaseIcon, Trash2, X, TerminalSquare, Sun, Moon, Monitor, AlertCircle } from "lucide-react";

function App() {
  const { connections, loading, error, load, remove } = useConnectionStore();
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useQueryStore();
  const fetchSecret = useSecretStore((s) => s.fetchSecret);
  const { mode: themeMode, setMode: setThemeMode, apply: applyTheme } = useThemeStore();
  const { sidebarWidth, load: loadLayout, save: saveLayout } = useLayoutStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const errorCount = useErrorLogStore((s) => s.entries.length);

  useEffect(() => {
    load();
    loadLayout();
    applyTheme();
    // Listen for OS theme changes when in system mode
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => useThemeStore.getState().apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [load, loadLayout, applyTheme]);

  // Save layout on unmount
  useEffect(() => () => saveLayout(), [saveLayout]);

  useEffect(() => {
    if (error) setGlobalError(appErrorMessage(error));
  }, [error]);

  const active = connections.find((c) => c.id === activeId) ?? null;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  useShortcuts({
    onNewTab: () => active && openTab(active, active.default_database ?? null),
    onCloseTab: () => activeTabId && closeTab(activeTabId),
    onToggleTheme: () => {
      const next = themeMode === "dark" ? "light" : "dark";
      setThemeMode(next);
    },
    onToggleErrorLog: () => setShowErrorLog((v) => !v),
  });

  async function handleSelectConnection(id: string) {
    setActiveId(id);
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      await fetchSecret(conn);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id);
      if (activeId === id) setActiveId(null);
    } catch (e) {
      setGlobalError(appErrorMessage(e as AppError));
    }
  }

  function handleNewQuery() {
    if (!active) return;
    openTab(active, active.default_database ?? null);
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* ErrorLog panel (overlay) */}
      {showErrorLog && (
        <div className="absolute inset-0 z-50 flex bg-background/90">
          <div className="flex-1 overflow-hidden">
            <ErrorLogPanel onClose={() => setShowErrorLog(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: connections + object tree */}
        <aside className="flex flex-col border-r border-border bg-card/30" style={{ width: sidebarWidth }}>
          {/* Connections section */}
          <div className="border-b border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">连接</span>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>新建连接</DialogTitle>
                  </DialogHeader>
                  <ConnectionForm onSaved={() => setDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="max-h-48 overflow-y-auto">
              {loading && <div className="p-3 text-sm text-muted-foreground">加载中...</div>}
              {connections.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/50 ${
                    activeId === c.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleSelectConnection(c.id)}
                >
                  <DatabaseIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 truncate">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.url}</div>
                  </div>
                  <button
                    className="hidden group:block text-destructive hover:opacity-70"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {!loading && connections.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">暂无连接,点击 + 新建</div>
              )}
            </div>
          </div>

          {/* Object tree section */}
          <div className="flex-1 overflow-hidden">
            {active ? (
              <ObjectTree connection={active} />
            ) : (
              <div className="p-3 text-sm text-muted-foreground">选择连接查看对象</div>
            )}
          </div>

          {/* New query button */}
          {active && (
            <div className="border-t border-border p-2">
              <Button size="sm" className="w-full" onClick={handleNewQuery}>
                <TerminalSquare className="h-3.5 w-3.5" />
                新建查询
              </Button>
            </div>
          )}
        </aside>

        {/* Center: query tabs + editor */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {tabs.length > 0 ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center border-b border-border bg-card/30">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={`group flex items-center gap-1 border-r border-border px-3 py-1.5 cursor-pointer text-sm ${
                      activeTabId === tab.id ? "bg-background" : "hover:bg-accent/30"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="truncate max-w-32">{tab.title}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Active editor */}
              {activeTab && (
                <div className="flex-1 overflow-hidden">
                  <QueryEditor tab={activeTab} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                {active ? (
                  <>
                    <p className="text-muted-foreground">点击左侧"新建查询"开始</p>
                    <Button className="mt-3" size="sm" onClick={handleNewQuery}>
                      <TerminalSquare className="h-3.5 w-3.5" />
                      新建查询
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">选择左侧连接开始</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom status bar */}
      <footer className="flex items-center gap-4 border-t border-border bg-card/30 px-3 py-1 text-xs text-muted-foreground">
        <span>InfluxDB GUI v0.1</span>
        <button
          className={`rounded px-1.5 py-0.5 hover:bg-accent ${errorCount > 0 ? "text-destructive font-medium" : ""}`}
          onClick={() => setShowErrorLog(!showErrorLog)}
          title="错误历史 (Ctrl+E)"
        >
          <AlertCircle className="mr-0.5 inline h-3 w-3" />
          {errorCount > 0 ? `${errorCount} 错误` : "错误"}
        </button>
        {globalError && <span className="text-destructive">{globalError}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button
            className="rounded p-1 hover:bg-accent"
            onClick={() => setThemeMode("system")}
            title="跟随系统"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1 hover:bg-accent"
            onClick={() => setThemeMode("light")}
            title="浅色"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1 hover:bg-accent"
            onClick={() => setThemeMode("dark")}
            title="深色"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <span className="ml-2">
            {active ? `${active.name}` : "未连接"} · {tabs.length} 个查询
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
