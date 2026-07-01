/**
 * Format an InfluxDB time value for display.
 *
 * InfluxDB returns time as either:
 * - An ISO 8601 string (if queried with tz() clause)
 * - A nanosecond epoch integer (default)
 *
 * This function handles both, plus the three display modes.
 */
export type TimeDisplayMode = "local" | "utc" | "ns";

export function formatTimeValue(
  value: unknown,
  mode: TimeDisplayMode = "local",
): string {
  // If it's already a string (ISO format), parse and reformat.
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return formatDate(d, mode, false);
    }
    return value;
  }

  // Nanosecond epoch integer.
  if (typeof value === "number") {
    if (mode === "ns") return String(value);
    return formatDate(nsToDate(value), mode, false);
  }

  return String(value ?? "");
}

/** Convert nanosecond epoch to Date (ms precision, ns truncated). */
export function nsToDate(ns: number): Date {
  return new Date(Math.floor(ns / 1_000_000));
}

function formatDate(d: Date, mode: TimeDisplayMode, _isNs: boolean): string {
  if (mode === "utc") {
    return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  }
  // local
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
