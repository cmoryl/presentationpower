// Readers for the richer module charts (multi-series, stacked, waterfall,
// scatter/bubble, ranges, heatmaps, part-to-whole). Each returns the neutral
// AdaptChart the adaptor redraws natively on every size.
import type { AdaptChart } from "./cross-format-adapt";

type R = Record<string, unknown>;
const n = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const x = Number.parseFloat(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(x) ? x : undefined;
  }
  return undefined;
};
const s = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const recs = (v: unknown): R[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as R[]) : []);
const uniq = <T,>(a: T[]) => a.filter((x, i) => a.indexOf(x) === i);

/** Long rows (period × series × value) pivoted into series. */
function pivot(rows: R[], xKey: string, sKey: string, vKey: string) {
  const xs = uniq(rows.map((r) => String(r[xKey])));
  const names = uniq(rows.map((r) => String(r[sKey])));
  const series = names.map((name) => ({
    name,
    values: xs.map((x) => n(rows.find((r) => String(r[xKey]) === x && String(r[sKey]) === name)?.[vKey]) ?? 0),
  }));
  return { xs, series };
}
const firstData = (xs: string[], series: { values: number[] }[]) =>
  xs.map((label, i) => ({ label, value: series.reduce((t, x) => t + (x.values[i] ?? 0), 0) }));

export function richChartFrom(c: R): AdaptChart | undefined {
  const rows = recs(c.rows);
  const r0 = rows[0];
  if (r0) {
    if ("source" in r0 && "target" in r0) {
      // Flows (sankey / chord): total volume per source.
      const xs = uniq(rows.map((r) => String(r.source)));
      return { kind: "bar", data: xs.map((label) => ({ label, value: rows.filter((r) => r.source === label).reduce((t, r) => t + (n(r.value) ?? 0), 0) })) };
    }
    if ("min" in r0 && "max" in r0) return { kind: "range", data: rows.map((r) => ({ label: String(r.label), value: n(r.median) ?? 0 })), ranges: rows.map((r) => ({ label: String(r.label), from: n(r.min) ?? 0, to: n(r.max) ?? 0, mid: n(r.median) })) };
    if ("before" in r0 && "after" in r0) return { kind: "range", data: rows.map((r) => ({ label: String(r.label), value: n(r.after) ?? 0 })), ranges: rows.map((r) => ({ label: String(r.label), from: n(r.before) ?? 0, to: n(r.after) ?? 0 })) };
    if ("start" in r0 && "end" in r0) return { kind: "range", data: rows.map((r) => ({ label: String(r.task ?? r.label), value: (n(r.end) ?? 0) - (n(r.start) ?? 0) })), ranges: rows.map((r) => ({ label: String(r.task ?? r.label), from: n(r.start) ?? 0, to: n(r.end) ?? 0 })) };
    if ("x" in r0 && "y" in r0) return { kind: "scatter", data: rows.map((r) => ({ label: String(r.label), value: n(r.value) ?? 1 })), points: rows.map((r) => ({ label: String(r.label), x: n(r.x) ?? 0, y: n(r.y) ?? 0, size: n(r.value) })) };
    if ("date" in r0) {
      // Calendar heatmap → monthly totals.
      const months = uniq(rows.map((r) => String(r.date).slice(0, 7)));
      return { kind: "line", data: months.map((m) => ({ label: m.slice(5), value: rows.filter((r) => String(r.date).startsWith(m)).reduce((t, r) => t + (n(r.value) ?? 0), 0) })) };
    }
    const xKey = "period" in r0 ? "period" : "axis" in r0 ? "axis" : undefined;
    const sKey = "series" in r0 ? "series" : "channel" in r0 ? "channel" : undefined;
    if (xKey && sKey) {
      const vKey = "rank" in r0 ? "rank" : "value";
      const { xs, series } = pivot(rows, xKey, sKey, vKey);
      const kind = "channel" in r0 ? "area" : "axis" in r0 ? "grouped" : "line";
      return { kind, data: firstData(xs, series), labels: xs, series, invert: vKey === "rank" };
    }
    if ("type" in r0 && rows.some((r) => (n(r.value) ?? 0) < 0)) return { kind: "waterfall", data: rows.map((r) => ({ label: String(r.label), value: n(r.value) ?? 0 })), totals: rows.map((r) => r.type === "total") };
    if ("category" in r0 && "value" in r0) {
      // Treemap / sunburst / beeswarm: part-to-whole by category.
      const cats = uniq(rows.map((r) => String(r.category)));
      return { kind: "bar", data: cats.map((label) => ({ label, value: rows.filter((r) => r.category === label).reduce((t, r) => t + (n(r.value) ?? 0), 0) })) };
    }
    if ("value" in r0) {
      const data = rows.map((r) => ({ label: String(r.label), value: n(r.value) ?? 0 }));
      const pct = data.every((d) => d.value >= 0 && d.value <= 100);
      return { kind: pct && data.length <= 6 ? "ring" : "bar", data, unit: pct ? s(r0.unit) ?? "%" : s(r0.unit) };
    }
  }
  // Multi-series with point arrays (line multi / area stack).
  const ser = recs(c.series).filter((x) => Array.isArray(x.points));
  if (ser.length) {
    const series = ser.map((x) => ({ name: String(x.label), values: (x.points as unknown[]).map((v) => n(v) ?? 0) }));
    const len = Math.max(...series.map((x) => x.values.length));
    const ax = (c.axis as R | undefined)?.x;
    const labels = Array.isArray(ax) ? ax.map(String) : Array.isArray(c.labels) ? (c.labels as unknown[]).map(String) : Array.from({ length: len }, (_, i) => String(i + 1));
    const unit = s(c.unit);
    // Percent curves never stack; volumes do.
    return { kind: unit === "%" ? "line" : "area", data: firstData(labels, series), labels, series, unit: unit === "%" ? "%" : undefined };
  }
  const cols = recs(c.columns).filter((x) => Array.isArray(x.values));
  if (cols.length && cols.every((x) => (x.values as unknown[]).every((v) => typeof v === "number"))) {
    const k = (cols[0].values as unknown[]).length;
    const segs = recs(c.segments).map((x) => s(x.label) ?? s(x.name)).filter(Boolean) as string[];
    const names = segs.length ? segs : Array.isArray(c.legend) ? (c.legend as unknown[]).map(String) : Array.from({ length: k }, (_, i) => `Series ${i + 1}`);
    const labels = cols.map((x) => String(x.label));
    const series = names.slice(0, k).map((name, j) => ({ name, values: cols.map((x) => n((x.values as unknown[])[j]) ?? 0) }));
    return { kind: "stacked", data: firstData(labels, series), labels, series };
  }
  const steps = recs(c.steps).filter((x) => n(x.value) !== undefined);
  if (steps.length >= 2 && steps.some((x) => x.kind)) return { kind: "waterfall", data: steps.map((x) => ({ label: String(x.label), value: n(x.value) ?? 0 })), totals: steps.map((x) => x.kind === "start" || x.kind === "total" || x.kind === "end") };
  if (Array.isArray(c.cells) && (c.cells as unknown[]).every(Array.isArray)) {
    const matrix = (c.cells as unknown[][]).map((row) => row.map((v) => n(v) ?? 0));
    const rl = Array.isArray(c.rows) ? (c.rows as unknown[]).map(String) : matrix.map((_, i) => `Row ${i + 1}`);
    const cl = Array.isArray(c.cols) ? (c.cols as unknown[]).map(String) : Array.isArray(c.columns) ? (c.columns as unknown[]).map(String) : matrix[0].map((_, i) => `${i + 1}`);
    return { kind: "heatmap", data: rl.map((label, i) => ({ label, value: matrix[i]?.[0] ?? 0 })), matrix, labels: cl, rowLabels: rl };
  }
  const pts = recs(c.points).filter((x) => "bar" in x && "line" in x);
  if (pts.length >= 2) {
    const labels = pts.map((x) => String(x.label));
    return { kind: "combo", data: pts.map((x) => ({ label: String(x.label), value: n(x.bar) ?? 0 })), labels, series: [{ name: String(c.barLabel ?? "Bars"), values: pts.map((x) => n(x.bar) ?? 0) }, { name: String(c.lineLabel ?? "Line"), values: pts.map((x) => n(x.line) ?? 0) }] };
  }
  const items = recs(c.items);
  const i0 = items[0];
  if (i0 && items.length >= 2) {
    const L = (x: R) => String(x.label ?? x.phase ?? x.name ?? "");
    if ("x" in i0 && "y" in i0 && "size" in i0) return { kind: "scatter", data: items.map((x) => ({ label: L(x), value: n(x.size) ?? 1 })), points: items.map((x) => ({ label: L(x), x: n(x.x) ?? 0, y: n(x.y) ?? 0, size: n(x.size) })) };
    if ("start" in i0 && "end" in i0) return { kind: "range", data: items.map((x) => ({ label: L(x), value: (n(x.end) ?? 0) - (n(x.start) ?? 0) + 1 })), ranges: items.map((x) => ({ label: L(x), from: (n(x.start) ?? 1) - 1, to: n(x.end) ?? 1 })) };
    if ("current" in i0 && "benchmark" in i0) return { kind: "grouped", data: items.map((x) => ({ label: L(x), value: n(x.current) ?? 0 })), labels: items.map(L), series: [{ name: "Current", values: items.map((x) => n(x.current) ?? 0) }, { name: "Benchmark", values: items.map((x) => n(x.benchmark) ?? 0) }], unit: "%" };
    if ("done" in i0 && "total" in i0) return { kind: "ring", data: items.map((x) => ({ label: L(x), value: Math.round(((n(x.done) ?? 0) / Math.max(1, n(x.total) ?? 1)) * 100) })), unit: "%" };
    if ("sentiment" in i0) return { kind: "line", data: items.map((x) => ({ label: L(x), value: n(x.sentiment) ?? 0 })) };
    if ("percent" in i0) {
      const data = items.map((x) => ({ label: L(x), value: n(x.percent) ?? 0 }));
      return { kind: "bar", data, unit: "%" };
    }
  }
  return undefined;
}
