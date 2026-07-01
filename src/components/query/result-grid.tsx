import { useState, useMemo } from "react";
import type { QueryResult } from "@/lib/types";
import { formatTimeValue, type TimeDisplayMode } from "@/lib/time-format";
import { ChevronUp, ChevronDown, Copy, Search } from "lucide-react";

interface Props {
  result: QueryResult;
}

export function ResultGrid({ result }: Props) {
  const [timeMode, setTimeMode] = useState<TimeDisplayMode>("local");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const series = result.series[0];
  if (!series) {
    return <div className="p-4 text-sm text-muted-foreground">无数据返回</div>;
  }

  const { columns, values } = series;

  // Determine if first column is "time"
  const timeColIdx = columns.findIndex((c) => c.toLowerCase() === "time");

  // Sort
  const sortedValues = useMemo(() => {
    if (!sortCol) return values;
    const colIdx = columns.indexOf(sortCol);
    if (colIdx < 0) return values;
    const sorted = [...values].sort((a, b) => {
      const av = a[colIdx];
      const bv = b[colIdx];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [values, sortCol, sortDir, columns]);

  // Filter by search
  const filteredValues = useMemo(() => {
    if (!search) return sortedValues;
    const lower = search.toLowerCase();
    return sortedValues.filter((row) =>
      row.some((cell) => String(cell ?? "").toLowerCase().includes(lower)),
    );
  }, [sortedValues, search]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function copyRow(row: unknown[]) {
    const tsv = row.map((c) => String(c ?? "")).join("\t");
    navigator.clipboard.writeText(tsv);
  }

  function formatCell(colIdx: number, value: unknown): string {
    if (colIdx === timeColIdx && timeMode !== "ns") {
      return formatTimeValue(value, timeMode);
    }
    if (value === null || value === undefined) return "";
    return String(value);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1">
        {timeColIdx >= 0 && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">时间:</span>
            {(["local", "utc", "ns"] as TimeDisplayMode[]).map((m) => (
              <button
                key={m}
                className={`rounded px-1.5 py-0.5 ${timeMode === m ? "bg-accent" : "hover:bg-accent/50"}`}
                onClick={() => setTimeMode(m)}
              >
                {m === "local" ? "本地" : m === "utc" ? "UTC" : "纳秒"}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            className="h-6 w-40 rounded border border-input bg-background px-2 text-xs"
            placeholder="搜索结果..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/50">
            <tr>
              <th className="w-8 border-b border-border px-1 py-1 text-left">
                <Copy className="h-3 w-3 text-muted-foreground" />
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="cursor-pointer border-b border-border px-2 py-1 text-left font-medium hover:bg-accent/30"
                  onClick={() => toggleSort(col)}
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {sortCol === col && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredValues.map((row, ri) => (
              <tr key={ri} className="hover:bg-accent/20">
                <td className="px-1 py-0.5">
                  <button
                    className="opacity-0 hover:opacity-100"
                    onClick={() => copyRow(row)}
                    title="复制行"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-border/30 px-2 py-0.5">
                    {formatCell(ci, cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-2 py-0.5 text-xs text-muted-foreground">
        {filteredValues.length} 行{search && ` (过滤自 ${values.length})`}
        {result.error && <span className="ml-2 text-destructive">错误: {result.error}</span>}
      </div>
    </div>
  );
}
