import type { SeriesRow } from "./types";

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert a series to CSV string. */
export function seriesToCsv(series: SeriesRow): string {
  const header = series.columns.map(escapeCsvField).join(",");
  const rows = series.values.map((row) => row.map(escapeCsvField).join(","));
  return [header, ...rows].join("\n");
}

/** Convert a series to JSON string (array of objects keyed by column name). */
export function seriesToJson(series: SeriesRow): string {
  const objects = series.values.map((row) => {
    const obj: Record<string, unknown> = {};
    series.columns.forEach((col, idx) => {
      obj[col] = row[idx] ?? null;
    });
    return obj;
  });
  return JSON.stringify(objects, null, 2);
}

/** Trigger a file download in the browser. */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
