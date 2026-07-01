import { useState, useCallback } from "react";
import { useMetadataStore } from "@/stores/metadata-store";
import { useSecretStore } from "@/stores/secret-store";
import { useQueryStore } from "@/stores/query-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChevronRight, ChevronDown, Database as DbIcon, Table2, Tag, Hash, RefreshCw } from "lucide-react";
import type { Connection } from "@/lib/types";

interface Props {
  connection: Connection;
}

export function ObjectTree({ connection }: Props) {
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [expandedMs, setExpandedMs] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const { databases, measurements, tagKeys, fieldKeys, fetchDatabases, fetchMeasurements, fetchTagKeys, fetchFieldKeys } = useMetadataStore();
  const getSecret = useSecretStore((s) => s.getSecret);
  const { openTab, updateSource } = useQueryStore();
  const [loading, setLoading] = useState(false);

  const dbKey = connection.id;
  const dbs = databases[dbKey] ?? [];
  const secret = getSecret(connection);

  const loadDatabases = useCallback(async () => {
    setLoading(true);
    try {
      await fetchDatabases(connection, secret);
    } finally {
      setLoading(false);
    }
  }, [connection, secret, fetchDatabases]);

  const toggleDatabase = useCallback(async (db: string) => {
    if (expandedDb === db) {
      setExpandedDb(null);
      return;
    }
    setExpandedDb(db);
    if (!measurements[`${connection.id}:${db}`]) {
      await fetchMeasurements(connection, db, secret);
    }
  }, [expandedDb, connection, secret, measurements, fetchMeasurements]);

  const toggleMeasurement = useCallback(async (db: string, ms: string) => {
    const key = `${connection.id}:${db}:${ms}`;
    if (expandedMs === ms) {
      setExpandedMs(null);
      return;
    }
    setExpandedMs(ms);
    if (!tagKeys[key] && !fieldKeys[key]) {
      await Promise.all([
        fetchTagKeys(connection, db, ms, secret),
        fetchFieldKeys(connection, db, ms, secret),
      ]);
    }
  }, [expandedMs, connection, secret, tagKeys, fieldKeys, fetchTagKeys, fetchFieldKeys]);

  // Auto-load databases on first render
  if (dbs.length === 0 && !loading) {
    void loadDatabases();
  }

  const filteredDbs = filter
    ? dbs.filter((d) => d.toLowerCase().includes(filter.toLowerCase()))
    : dbs;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border p-2">
        <input
          className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          placeholder="过滤 database..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          className="rounded-md p-1 hover:bg-accent"
          onClick={loadDatabases}
          title="刷新"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1 text-sm">
        {loading && <div className="p-2 text-xs text-muted-foreground">加载中...</div>}
        {!loading && filteredDbs.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground">无 database</div>
        )}
        {filteredDbs.map((db) => {
          const msList = measurements[`${connection.id}:${db}`] ?? [];
          const isExpanded = expandedDb === db;
          return (
            <div key={db}>
              <button
                className="flex w-full items-center gap-1 rounded px-1 py-1 hover:bg-accent/50"
                onClick={() => toggleDatabase(db)}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <DbIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{db}</span>
              </button>

              {isExpanded && (
                <div className="ml-3 border-l border-border pl-1">
                  {msList.map((ms) => {
                    const msExpanded = expandedMs === ms;
                    const tKeys = tagKeys[`${connection.id}:${db}:${ms}`] ?? [];
                    const fKeys = fieldKeys[`${connection.id}:${db}:${ms}`] ?? [];
                    return (
                      <div key={ms}>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              className="flex w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50"
                              onClick={() => toggleMeasurement(db, ms)}
                            >
                              {msExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate text-xs">{ms}</span>
                            </button>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            <ContextMenuItem
                              onClick={() => {
                                const q = `SELECT * FROM "${ms}" LIMIT 100`;
                                const tabId = openTab(connection, connection.default_database ?? db);
                                // Sync update — Zustand batching guarantees state is updated
                                setTimeout(() => {
                                  const tab = useQueryStore.getState().tabs.find(t => t.id === tabId);
                                  if (tab) updateSource(tab.id, q);
                                }, 0);
                              }}
                            >
                              Preview 100 行
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => navigator.clipboard.writeText(ms)}>
                              复制名称
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                const active = useQueryStore.getState().tabs.find(t => t.id === useQueryStore.getState().activeTabId);
                                if (active) {
                                  updateSource(active.id, active.source + `\n${ms}`);
                                }
                              }}
                            >
                              插入到编辑器
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>

                        {msExpanded && (
                          <div className="ml-3 border-l border-border pl-1">
                            <div className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                              <Tag className="mr-1 inline h-3 w-3" />Tag Keys
                            </div>
                            {tKeys.map((k) => (
                              <div key={k} className="px-3 py-0.5 text-xs text-muted-foreground">{k}</div>
                            ))}
                            <div className="px-1 py-0.5 text-xs font-medium text-muted-foreground">
                              <Hash className="mr-1 inline h-3 w-3" />Field Keys
                            </div>
                            {fKeys.map((k) => (
                              <div key={k.name} className="flex items-center gap-1 px-3 py-0.5 text-xs text-muted-foreground">
                                <span>{k.name}</span>
                                <span className="rounded bg-muted px-1 text-[10px]">{k.type}</span>
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
        })}
      </div>
    </div>
  );
}
