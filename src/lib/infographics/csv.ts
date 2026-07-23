// CSV / markdown-table serializers for InfographicSpec data.

import type { InfographicRow, InfographicSpec } from "./spec";

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Return the union of keys across all rows, preserving first-seen order. */
export function columnsOf(rows: InfographicRow[]): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!set.has(k)) {
        set.add(k);
        seen.push(k);
      }
    }
  }
  return seen;
}

export function specToCsv(spec: InfographicSpec): string {
  const cols = columnsOf(spec.data.rows);
  const header = cols
    .map((k) => escapeCsvCell(spec.data.columns?.[k] ?? k))
    .join(",");
  const lines = spec.data.rows.map((row) =>
    cols.map((k) => escapeCsvCell(row[k])).join(","),
  );
  return [header, ...lines].join("\r\n");
}

export function specToMarkdown(spec: InfographicSpec): string {
  const cols = columnsOf(spec.data.rows);
  if (cols.length === 0) return "";
  const headers = cols.map((k) => spec.data.columns?.[k] ?? k);
  const sep = cols.map(() => "---");
  const body = spec.data.rows.map((row) =>
    cols.map((k) => String(row[k] ?? "")).join(" | "),
  );
  return [
    "| " + headers.join(" | ") + " |",
    "| " + sep.join(" | ") + " |",
    ...body.map((r) => "| " + r + " |"),
  ].join("\n");
}

export function downloadSpecAsCsv(spec: InfographicSpec, filename?: string): void {
  if (typeof window === "undefined") return;
  const csv = specToCsv(spec);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${spec.id || "chart"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
