// Single source of truth mapping MV-VIZ-* module variant ids to the
// InfographicKind their spec should default to. Both the on-screen renderer
// (InfographicSlideModule) and the PPTX/PDF export pipeline read from here so
// the two can never drift — a drifted map is what makes an exported viz slide
// fall back to an empty "custom" chart.

import type { InfographicKind } from "./spec";

export const VIZ_KIND_BY_VARIANT: Record<string, InfographicKind> = {
  "MV-VIZ-SANKEY": "sankey",
  "MV-VIZ-CHORD": "chord",
  "MV-VIZ-BEESWARM": "beeswarm",
  "MV-VIZ-BUMP": "bump",
  "MV-VIZ-MARKET-MAP": "market-map",
  "MV-VIZ-TREEMAP": "treemap",
  "MV-VIZ-CALENDAR-HEATMAP": "calendar-heatmap",
};

/** Kinds buildEchartsOption() implements — anything else renders empty. */
export const SUPPORTED_VIZ_KINDS: InfographicKind[] = [
  "sankey",
  "chord",
  "beeswarm",
  "bump",
  "market-map",
  "treemap",
  "calendar-heatmap",
];

/**
 * Resolve the chart kind for a variant id. Falls back to deriving the kind
 * from the id suffix (`MV-VIZ-MARKET-MAP` -> `market-map`) so a newly added
 * viz module still exports the right chart before the map is updated.
 */
export function vizKindForVariant(variantId: string | undefined | null): InfographicKind {
  if (!variantId) return "custom";
  const mapped = VIZ_KIND_BY_VARIANT[variantId];
  if (mapped) return mapped;
  const suffix = variantId.replace(/^MV-VIZ-/, "").toLowerCase();
  const derived = SUPPORTED_VIZ_KINDS.find((k) => k === suffix);
  return derived ?? "custom";
}
