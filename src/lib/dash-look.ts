// -----------------------------------------------------------------------------
// DASH LOOK — per-skin dashboard reflow + chart-variant swap
//
// Chart *grammar* (chart-styles.ts) restyles a chart; pack composition
// (pack-compose.ts) restyles the page. Neither of them changes WHICH chart a
// dashboard module draws, or HOW its blocks are arranged — so a KPI dashboard
// in one alternate look still read as the same dashboard in another colour.
//
// This layer answers two questions per (skin pack × dashboard module):
//
//   flow   — how the module's blocks reflow on the sheet (split ratios, rails,
//            stacked bands, quadrants, reversed order).
//   chart  — which chart family renders the numbers (ring, dial, column, area,
//            line, bullet, spark, plate).
//
// Resolution is deterministic and pack-unique: the pack's scaffold + margin
// device pair (already unique per skin) picks the flow family, and the module id
// rotates the chart family inside a per-pack offset. Same pack + same module
// always renders the same way across previews, lookbook, live slides and export.
// The approved brand system (no pack) always renders the canonical layout.
// -----------------------------------------------------------------------------

import { packCompose } from "./pack-compose";
import { packGeometry } from "./pack-geometry";
import type { StylePack } from "./style-packs";

export type DashFlow =
  | "canonical" // approved brand arrangement
  | "splitWide" // dominant left mass, narrow support column
  | "splitNarrow" // narrow lead column, dominant support mass
  | "railLeft" // metrics rail on the leading edge, chart fills the rest
  | "railRight" // chart leads, metrics rail trails
  | "bands" // full-width stacked bands
  | "quadrant" // 2x2 field
  | "ribbonBottom"; // hero figure up top, metric ribbon along the floor

export type DashChart =
  | "ring" // donut
  | "dial" // semi gauge
  | "column" // vertical bars
  | "bar" // horizontal bars / bullets
  | "area" // filled trend
  | "line" // stroked trend
  | "spark" // compact sparkline
  | "plate"; // numeral-first, no chart body

export interface DashLook {
  flow: DashFlow;
  /** Grid template for the module's primary split, when the flow uses one. */
  columns: string;
  /** Reverse the natural block order (support mass leads). */
  reverse: boolean;
  /** Chart family for the module's main data visual. */
  chart: DashChart;
  /** Chart family for secondary/repeated metrics (cells, trio, cards). */
  metric: DashChart;
  /** Column count for repeated metric grids (3 = canonical trio). */
  metricColumns: number;
  /** Gap multiplier for the module's internal rhythm. */
  gap: number;
}

const CANONICAL: DashLook = {
  flow: "canonical",
  columns: "1fr 1fr",
  reverse: false,
  chart: "area",
  metric: "ring",
  metricColumns: 3,
  gap: 1,
};

const FLOWS: DashFlow[] = [
  "splitWide",
  "splitNarrow",
  "railLeft",
  "railRight",
  "bands",
  "quadrant",
  "ribbonBottom",
];

const FLOW_COLUMNS: Record<DashFlow, string> = {
  canonical: "1fr 1fr",
  splitWide: "1.45fr 0.8fr",
  splitNarrow: "0.72fr 1.5fr",
  railLeft: "0.62fr 1.6fr",
  railRight: "1.6fr 0.62fr",
  bands: "1fr",
  quadrant: "1fr 1fr",
  ribbonBottom: "1fr",
};

/** Chart families a module may legitimately swap between. */
const CHART_POOL: Record<string, DashChart[]> = {
  "MV-DASH-SUMMARY": ["area", "spark", "column", "line"],
  "MV-DASH-DONUT-TRIO": ["ring", "dial", "column", "plate"],
  "MV-DASH-SALES-CHART": ["area", "column", "line", "bar"],
  "MV-DASH-GAUGE-ROW": ["dial", "ring", "bar", "plate"],
  "MV-DASH-PERFORMANCE": ["line", "area", "column", "spark"],
  "MV-DASH-REPORT-CARDS": ["spark", "bar", "ring", "plate"],
  "MV-DASH-GROWTH-COLUMNS": ["column", "bar", "area", "line"],
  "MV-DASH-BREAKDOWN": ["bar", "column", "ring", "plate"],
  "MV-DASH-REGION-STATS": ["plate", "bar", "spark", "ring"],
};

const METRIC_POOL: DashChart[] = ["ring", "dial", "spark", "bar", "plate", "column"];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** True when this module has an alternate-look dashboard treatment. */
export function isDashModule(variantId: string): boolean {
  return variantId in CHART_POOL;
}

/**
 * Resolve the dashboard treatment for a module under the active look.
 * `pack === null` (approved brand system) returns the canonical arrangement.
 */
export function dashLook(pack: StylePack | null | undefined, variantId: string): DashLook {
  if (!pack || !isDashModule(variantId)) return CANONICAL;

  const geo = packGeometry(pack);
  const compose = packCompose(pack);
  const seed = hash(`${pack.id}:${geo.scaffold}:${geo.device}`);
  const moduleSeed = hash(variantId);

  // Flow: scaffold + margin device drive the family so two skins never compose
  // a dashboard the same way; the module id nudges it so one skin's dashboards
  // don't all collapse into one arrangement.
  const flow = FLOWS[(seed + (moduleSeed % 3)) % FLOWS.length]!;

  const pool = CHART_POOL[variantId] ?? ["area", "column", "ring", "plate"];
  const chart = pool[(seed >>> 3) % pool.length]!;

  // Secondary metrics pick a *different* family from the primary chart so a
  // dashboard always shows two visual registers.
  const metricCandidates = METRIC_POOL.filter((m) => m !== chart);
  const metric = metricCandidates[(seed >>> 7) % metricCandidates.length]!;

  const metricColumns = flow === "quadrant" ? 2 : flow === "bands" ? 4 : ((seed >>> 11) % 2) + 3;

  return {
    flow,
    columns: FLOW_COLUMNS[flow],
    reverse: compose.order === "reverse" || compose.order === "mediaLast",
    chart,
    metric,
    metricColumns,
    gap: compose.rhythm > 1 ? 1.25 : compose.rhythm < 1 ? 0.8 : 1,
  };
}
