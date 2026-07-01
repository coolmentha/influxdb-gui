import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQueryStore } from "@/stores/query-store";
import { useSecretStore } from "@/stores/secret-store";
import { resolveExecutionScope, splitStatements } from "@/lib/execution-scope";
import { appErrorMessage } from "@/lib/types";
import { Play, Square } from "lucide-react";
import { ResultGrid } from "./result-grid";
import type { QueryTab } from "@/stores/query-store";

interface Props {
  tab: QueryTab;
}

export function QueryEditor({ tab }: Props) {
  const { updateSource, runQuery, executions } = useQueryStore();
  const exec = executions[tab.id];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scopeLabel, setScopeLabel] = useState<string>("");
  const [activeResultIdx, setActiveResultIdx] = useState(0);

  // Load secret for the connection (cached in secret store)
  const fetchSecret = useSecretStore((s) => s.fetchSecret);
  useEffect(() => {
    void fetchSecret(tab.connection);
  }, [tab.connection, fetchSecret]);

  function handleRun(all = false) {
    const ta = textareaRef.current;
    if (!ta) return;
    const source = ta.value;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    let scope;
    if (all) {
      // Force "all": pass entire source split into statements
      scope = { scope: "all" as const, statements: splitStatements(source) };
    } else {
      scope = resolveExecutionScope(source, start, end, start);
    }

    const labels = { selection: "选区", cursor: "光标语句", all: "全部" };
    setScopeLabel(`${labels[scope.scope]} (${scope.statements.length} 条)`);

    void runQuery(tab.id, scope.statements);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl+Enter: run resolved scope
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun(false);
    }
    // Ctrl+Shift+Enter: run all
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      handleRun(true);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        <Button size="sm" onClick={() => handleRun(false)} disabled={exec?.status === "running"}>
          <Play className="h-3.5 w-3.5" />
          运行 (Ctrl+Enter)
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleRun(true)} disabled={exec?.status === "running"}>
          运行全部 (Ctrl+Shift+Enter)
        </Button>
        {exec?.status === "running" && (
          <Button size="sm" variant="destructive" disabled>
            <Square className="h-3.5 w-3.5" />
            运行中...
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {tab.connection.name}
          {tab.database && ` / ${tab.database}`}
        </span>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        className="h-48 resize-none border-b border-border bg-background p-2 font-mono text-sm outline-none"
        value={tab.source}
        onChange={(e) => updateSource(tab.id, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入 InfluxQL 查询... 例如: SELECT * FROM cpu LIMIT 10"
        spellCheck={false}
      />

      {/* Scope indicator */}
      {scopeLabel && (
        <div className="border-b border-border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
          执行范围: {scopeLabel}
        </div>
      )}

      {/* Auto-limit / truncation banner */}
      {exec?.autoLimitApplied && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
          ⚠ 已自动注入 LIMIT {exec.autoLimitValue} (ADR-0002)
        </div>
      )}
      {exec?.truncated && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
          ⚠ 结果已截断至 100,000 行 (硬上限)
        </div>
      )}

      {/* Error */}
      {exec?.status === "error" && exec.error && (
        <div className="border-b border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
          {appErrorMessage(exec.error)}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {exec?.status === "success" && exec.results && exec.results.length > 0 ? (
          <div className="flex h-full flex-col">
            {exec.results.length > 1 && (
              <div className="flex border-b border-border bg-card/30">
                {exec.results.map((r, idx) => (
                  <button
                    key={idx}
                    className={`border-r border-border px-2 py-0.5 text-xs ${
                      activeResultIdx === idx ? "bg-background font-medium" : "hover:bg-accent/30"
                    }`}
                    onClick={() => setActiveResultIdx(idx)}
                  >
                    结果 {idx + 1}
                    {r.error && <span className="ml-1 text-destructive">⚠</span>}
                  </button>
                ))}
              </div>
            )}
            {exec.results[activeResultIdx] ? (
              <ResultGrid result={exec.results[activeResultIdx]} />
            ) : (
              <div className="p-4 text-sm text-muted-foreground">选择一个结果子 tab</div>
            )}
          </div>
        ) : exec?.status === "success" ? (
          <div className="p-4 text-sm text-muted-foreground">查询成功,无数据返回</div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            执行查询后结果将显示在此
          </div>
        )}
      </div>

      {/* Footer with elapsed */}
      {exec?.elapsedMs != null && (
        <div className="border-t border-border px-2 py-0.5 text-xs text-muted-foreground">
          耗时 {exec.elapsedMs}ms
        </div>
      )}
    </div>
  );
}
