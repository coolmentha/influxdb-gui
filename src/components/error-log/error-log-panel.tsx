import { useState } from "react";
import { useErrorLogStore, entryToMarkdown, type ErrorLogEntry } from "@/stores/error-log-store";
import { appErrorMessage } from "@/lib/types";
import { X, Copy, Trash2, AlertCircle } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function ErrorLogPanel({ onClose }: Props) {
  const { entries, clear, remove } = useErrorLogStore();
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const selected = entries.find((e) => e.id === selectedId) ?? null;

  function copyMarkdown(entry: ErrorLogEntry) {
    navigator.clipboard.writeText(entryToMarkdown(entry));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          错误历史 ({entries.length})
        </span>
        <div className="flex items-center gap-1">
          <button className="rounded p-1 hover:bg-accent" onClick={clear} title="清空">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button className="rounded p-1 hover:bg-accent" onClick={onClose} title="关闭">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Entry list */}
        <div className="w-64 overflow-y-auto border-r border-border">
          {entries.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">暂无错误</div>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`cursor-pointer border-b border-border/50 px-2 py-1.5 hover:bg-accent/30 ${
                selectedId === entry.id ? "bg-accent" : ""
              }`}
              onClick={() => setSelectedId(entry.id)}
            >
              <div className="flex items-center gap-1">
                <span className="rounded bg-destructive/20 px-1 text-[10px] text-destructive">
                  {entry.error.kind}
                </span>
                <span className="truncate text-xs">{entry.connectionName}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{entry.query}</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-3">
          {selected ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{appErrorMessage(selected.error)}</span>
                <button
                  className="rounded p-1 hover:bg-accent"
                  onClick={() => copyMarkdown(selected)}
                  title="复制为 Markdown"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(selected.timestamp).toLocaleString()}
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">查询</div>
                <pre className="rounded-md bg-muted/50 p-2 text-xs overflow-x-auto">{selected.query}</pre>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">错误详情</div>
                <pre className="rounded-md bg-muted/50 p-2 text-xs overflow-x-auto">
                  {JSON.stringify(selected.error, null, 2)}
                </pre>
              </div>
              <button
                className="mt-2 self-start text-xs text-destructive hover:underline"
                onClick={() => { remove(selected.id); setSelectedId(null); }}
              >
                删除此条
              </button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">选择左侧条目查看详情</div>
          )}
        </div>
      </div>
    </div>
  );
}
