// -----------------------------------------------------------------------------
// CHART / GRAPH PARITY SCOPE
//
// Single source of truth for "which module variants render a data graphic".
// Used by the chart-parity gate (scripts/chart-parity.mjs) to decide which
// cells get compared graphic-region-first instead of whole-frame.
//
// Derived from the taxonomy rather than hand-listed so a new dashboard/graph
// module is picked up by the gate the moment it lands.
// -----------------------------------------------------------------------------
import { MODULE_VARIANTS, type ModuleVariant } from "@/lib/taxonomy";

/** Variant-id prefixes that are always data graphics. */
const CHART_ID_PREFIXES = ["MV-DASH-", "MV-GRAPH-", "MV-CHART-", "MV-DATA-"];

/** Words in name/description that mean "this draws a plotted graphic". */
const CHART_KEYWORDS = [
  "chart",
  "graph",
  "gauge",
  "donut",
  "sparkline",
  "scatter",
  "histogram",
  "waterfall",
  "bridge chart",
  "plotted",
  "y-axis",
  "x-axis",
  "gridline",
  "time series",
  "trend line",
  "area over",
  "bar column",
  "rank shifts",
  "funnel",
];

export function isChartVariant(v: ModuleVariant): boolean {
  if (CHART_ID_PREFIXES.some((p) => v.id.startsWith(p))) return true;
  const hay = `${v.name} ${v.description}`.toLowerCase();
  // Word-boundary matching: "graph" must not match "photograph", and "bar"
  // must not match "barrier".
  return CHART_KEYWORDS.some((k) =>
    new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(hay),
  );
}

/** Ordered list of chart/graph variant ids in scope for the parity gate. */
export function chartParityVariantIds(): string[] {
  return MODULE_VARIANTS.filter(isChartVariant).map((v) => v.id);
}
