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
  "plot",
  "axis",
  "gridline",
  "series",
  "waterfall",
  "bridge",
  "histogram",
  "scatter",
  "funnel",
  "bump chart",
  "area",
  "bar ",
  "line ",
];

export function isChartVariant(v: ModuleVariant): boolean {
  if (CHART_ID_PREFIXES.some((p) => v.id.startsWith(p))) return true;
  const hay = `${v.name} ${v.description}`.toLowerCase();
  return CHART_KEYWORDS.some((k) => hay.includes(k));
}

/** Ordered list of chart/graph variant ids in scope for the parity gate. */
export function chartParityVariantIds(): string[] {
  return MODULE_VARIANTS.filter(isChartVariant).map((v) => v.id);
}
