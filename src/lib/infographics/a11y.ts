// Auto-generate ARIA short alt + long description from an InfographicSpec.
// Deterministic — same spec always produces the same text so screen-reader
// UX stays predictable across renders and exports.

import type { InfographicKind, InfographicRow, InfographicSpec } from "./spec";

const KIND_LABEL: Record<InfographicKind, string> = {
  kpi: "KPI dashboard",
  bar: "bar chart",
  column: "column chart",
  line: "line chart",
  area: "area chart",
  donut: "donut chart",
  gauge: "gauge chart",
  heatmap: "heatmap",
  treemap: "treemap",
  sankey: "sankey diagram",
  chord: "chord diagram",
  beeswarm: "beeswarm distribution",
  bump: "ranking bump chart",
  "market-map": "2×2 market map",
  waterfall: "waterfall chart",
  funnel: "funnel chart",
  "calendar-heatmap": "calendar heatmap",
  custom: "custom infographic",
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function topBy(
  rows: InfographicRow[],
  valueKey: string | undefined,
  labelKey: string | undefined,
  n: number,
): Array<{ label: string; value: number }> {
  if (!valueKey) return [];
  const items = rows
    .map((r) => {
      const v = num(r[valueKey]);
      if (v === null) return null;
      const label = labelKey ? String(r[labelKey] ?? "") : String(r[valueKey] ?? "");
      return { label, value: v };
    })
    .filter((x): x is { label: string; value: number } => x !== null);
  items.sort((a, b) => b.value - a.value);
  return items.slice(0, n);
}

function trendDirection(rows: InfographicRow[], key?: string): "up" | "down" | "flat" | null {
  if (!key || rows.length < 2) return null;
  const first = num(rows[0][key]);
  const last = num(rows[rows.length - 1][key]);
  if (first === null || last === null) return null;
  const delta = last - first;
  const scale = Math.max(Math.abs(first), Math.abs(last), 1);
  if (Math.abs(delta) / scale < 0.03) return "flat";
  return delta > 0 ? "up" : "down";
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Auto-generate short alt (<=120 chars) + long description. */
export function generateA11y(spec: InfographicSpec): { shortAlt: string; longDesc: string } {
  const kindLabel = KIND_LABEL[spec.kind] ?? "chart";
  const rows = spec.data.rows;
  const titlePart = spec.title ? `${spec.title}. ` : "";
  const rowCount = rows.length;

  const valueKey = spec.encoding.value ?? spec.encoding.y;
  const labelKey = spec.encoding.label ?? spec.encoding.x ?? spec.encoding.category;

  const top = topBy(rows, valueKey, labelKey, 3);
  const trend = trendDirection(rows, valueKey);

  // Short alt — one sentence, <=120 chars.
  let short = `${titlePart}${kindLabel} with ${rowCount} data point${rowCount === 1 ? "" : "s"}`;
  if (top[0]) short += `; top: ${top[0].label} (${fmt(top[0].value)})`;
  if (trend) short += `; trend ${trend}`;
  short += ".";
  if (short.length > 120) short = short.slice(0, 117) + "...";

  // Long description — multi-sentence, includes annotation headline/summary.
  const parts: string[] = [];
  parts.push(
    `${titlePart}This is a ${kindLabel} with ${rowCount} data point${rowCount === 1 ? "" : "s"}.`,
  );
  if (spec.subtitle) parts.push(spec.subtitle);
  if (top.length > 0) {
    const listed = top.map((t) => `${t.label} at ${fmt(t.value)}`).join(", ");
    parts.push(`Leading values: ${listed}.`);
  }
  if (trend === "up") parts.push("Overall trend is upward across the range.");
  else if (trend === "down") parts.push("Overall trend is downward across the range.");
  else if (trend === "flat") parts.push("Values are roughly flat across the range.");
  if (spec.annotations?.headline) parts.push(spec.annotations.headline);
  if (spec.annotations?.summary) parts.push(spec.annotations.summary);
  if (spec.data.source) parts.push(`Source: ${spec.data.source}.`);

  return { shortAlt: short, longDesc: parts.join(" ") };
}

/** If the spec already has non-empty accessibility text, keep it. Otherwise autogen. */
export function ensureA11y(spec: InfographicSpec): InfographicSpec {
  const a = spec.accessibility;
  const hasShort = a?.shortAlt && a.shortAlt.trim().length > 0;
  const hasLong = a?.longDesc && a.longDesc.trim().length > 0;
  if (hasShort && hasLong) return spec;
  const gen = generateA11y(spec);
  return {
    ...spec,
    accessibility: {
      shortAlt: hasShort ? a.shortAlt : gen.shortAlt,
      longDesc: hasLong ? a.longDesc : gen.longDesc,
      tabOrder: a?.tabOrder,
    },
  };
}
