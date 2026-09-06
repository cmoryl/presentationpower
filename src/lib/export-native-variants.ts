import { NATIVE_VIZ_VARIANT_IDS } from "./infographics/native-chart";
// -----------------------------------------------------------------------------
// Which module variants have a hand-written NATIVE PowerPoint renderer
//
// `renderAdvancedVariant` in pptx-export.ts is a switch over variant IDs. Every
// ID listed there is reconstructed shape-by-shape in OOXML. Anything NOT listed
// falls through to the family-generic renderers (cards / bullets / stats), which
// keep the copy but throw the graphic away — that is why diagram modules such as
// MV-INFO-HUB-SATELLITES used to export as a plain bulleted list.
//
// For those variants the exporter instead captures a design-exact graphic plate
// from the real on-screen renderer and re-emits the measured copy as native text
// boxes on top, so the exported slide matches the build 1:1 while staying
// editable. This module is the single source of truth for that decision.
//
// The list is asserted against the switch by
// src/lib/__tests__/export-native-variants.test.ts, so adding a native renderer
// without updating this file fails CI.
// -----------------------------------------------------------------------------

/** Variant IDs with a bespoke native OOXML renderer in `renderAdvancedVariant`. */
export const NATIVE_EMITTER_VARIANT_IDS: readonly string[] = [
  "MV-BENTO-5",
  "MV-BENTO-6",
  "MV-BENTO-7",
  "MV-BENTO-8",
  "MV-BENTO-VALUE-CLOSE",
  "MV-KPI-DASHBOARD",
  "MV-ROADMAP-QUARTERS",
  "MV-FUNNEL",
  "MV-FLYWHEEL",
  "MV-MATURITY-CURVE",
  "MV-JOURNEY-MAP",
  "MV-LOGO-WALL",
  "MV-MATRIX-2X2",
  "MV-ICEBERG",
  "MV-EDITORIAL-SPREAD",
  "MV-SPLIT-MANIFESTO",
  "MV-NUMBERS-TRIPTYCH",
  "MV-TIMELINE-VERTICAL",
  "MV-COMPARE-VS-LISTS",
  "MV-INFO-HUB-PILL-ORBIT",
  "MV-PROC-LAYER-STACK",
  "MV-PROC-PROOF-PAIRS",
  "MV-PROC-PLATFORM-LOOP",
  "MV-COMPARE-SLIDER",
  "MV-PULL-QUOTE-STACK",
  // Quote / testimonial family — rebuilt natively (Oct 2026) against
  // src/components/slide/modules/quote.tsx: oversized mark, kicker + accent
  // hairline, designed type scale, attribution block and outcome figure.
  "MV-QUOTE-CARD",
  "MV-QUOTE-PORTRAIT",
  "MV-QUOTE-METRIC",
  "MV-QUOTE-MULTI",
  "MV-QUOTE-POSTER",
  "MV-DEFINITION",
  "MV-PRINCIPLES",
  "MV-COUNTDOWN",
  "MV-HORIZON",
  "MV-DASH-SUMMARY",
  "MV-DASH-DONUT-TRIO",
  "MV-DASH-SALES-CHART",
  "MV-DASH-GAUGE-ROW",
  "MV-DASH-PERFORMANCE",
  "MV-DASH-REPORT-CARDS",
  "MV-DASH-GROWTH-COLUMNS",
  "MV-DASH-BREAKDOWN",
  "MV-DASH-REGION-STATS",
  "MV-GRAPH-YEAR-SERIES",
  "MV-GRAPH-AXIS-BARS",
  "MV-GRAPH-CATEGORY-BARS",
  "MV-GRAPH-DUAL-DONUT",
  "MV-GRAPH-RINGS",
  "MV-GRAPH-TASK-CARDS",
  "MV-GRAPH-TASK-DIALS",
  "MV-GRAPH-DECADE-AREA",
  "MV-GRAPH-PERCENT-COMPARE",
  "MV-GRAPH-LINE-MULTI",
  "MV-GRAPH-STACKED-BAR",
  "MV-GRAPH-AREA-STACK",
  "MV-GRAPH-WATERFALL",
  "MV-GRAPH-BUBBLE",
  "MV-GRAPH-HEATMAP",
  "MV-GRAPH-TREEMAP",
  "MV-GRAPH-COMBO",
  "MV-INFO-DONUT",
  "MV-INFO-FUNNEL",
  "MV-INFO-PYRAMID",
  "MV-INFO-VENN",
  "MV-INFO-CIRCULAR-FLOW",
  "MV-INFO-BAR-COMPARE",
  "MV-IMG-GRID-3",
  "MV-IMG-GRID-6",
  "MV-IMG-MATRIX-4",
  "MV-IMG-MATRIX-6",
  "MV-IMG-STRIP",
  "MV-IMG-BEFORE-AFTER",
  "MV-CASE-SPREAD",
  "MV-CASE-METRICS",
  "MV-CASE-STORY",
  "MV-CASE-LOGO-GRID",
  "MV-CLIENT-MATRIX",
  "MV-CLIENT-DETAIL-3",
  "MV-CLIENT-COMPARE",
  "MV-GOV-RACI",
  "MV-COMM-PRICING",
  "MV-COMM-INVESTMENT",
  "MV-DEC-MATRIX",
  "MV-DEC-COMPARE-TABLE",
  "MV-DEC-CHECKLIST",
  "MV-PROOF-LOGOS",
  "MV-PROOF-GROWTH-ORBITS",
  "MV-PROOF-CERT-ORBITS",
  "MV-SOL-CAP-CARDS",
  "MV-SHOW-DEVICE-QUAD",
  "MV-PROOF-LOGOS-STRIP",
  "MV-PROOF-LOGOS-MARQUEE",
  "MV-PROOF-LOGOS-FEATURED",
  "MV-PROOF-LOGOS-CATEGORIZED",
  "MV-PROOF-LOGOS-MOSAIC",
  "MV-RISK-MITIGATION",
  "MV-TEAM-BIOS-3",
  "MV-TEAM-BIOS-4",
  "MV-SOL-ARCHITECTURE",
  "MV-SOL-FEATURE-LIST",
  "MV-PROC-BEFORE-AFTER",
  "MV-OP-COVER-DOSSIER",
  "MV-OP-COVER-EDITORIAL",
  "MV-OP-COVER-GRADIENT",
  "MV-OP-COVER-GRID",
  "MV-OP-COVER-MEDIA",
  "MV-OP-COVER-MINIMAL",
  "MV-OP-COVER-MONOGRAM",
  "MV-OP-COVER-POSTER",
  "MV-OP-COVER-SPLIT",
  "MV-OP-COVER-STACKED",
  "MV-OP-AGENDA-VERTICAL",
  "MV-OP-DIVIDER-NUMBERED",
  "MV-OP-INTRO-TEAM",
  "MV-CLOSE-CTA",
  "MV-CLOSE-DUAL-CTA",
  "MV-CLOSE-CONTACT",
  "MV-CLOSE-DECISION",
  "MV-CLOSE-METRIC-PROMISE",
  "MV-CLOSE-QNA",
  "MV-CLOSE-CALENDAR",
  "MV-CLOSE-SPLIT",
  "MV-CLOSE-TIMELINE",
];

const NATIVE_SET = new Set<string>(NATIVE_EMITTER_VARIANT_IDS);

/**
 * DRIFTED native renderers.
 *
 * These variants DO have a `case` in `renderAdvancedVariant` (so they stay in
 * NATIVE_EMITTER_VARIANT_IDS, which mirrors the switch), but the hand-written
 * OOXML no longer describes the module the app actually renders. The close
 * family is the worst offender: the renderers centre a headline at a fixed 54pt
 * and invent a "GET STARTED" pill, while the on-screen design is a left-aligned
 * hero with a next-steps side panel — so exports came out with duplicated,
 * oversized, sometimes white-on-white copy.
 *
 * Until each renderer is rewritten against the current design, these variants
 * take the layered route instead: a design-exact plate from the real renderer
 * with measured copy and decomposed paint re-emitted as native, editable
 * PowerPoint objects. That is both faithful AND editable.
 */
export const DRIFTED_NATIVE_RENDERER_IDS: readonly string[] = [
  // The KPI dashboard on screen is a bento mosaic (hero tile, ring gauge,
  // sparkline, bar tiles); the hand-written renderer still draws a uniform
  // card grid with a bottom gauge, so sizing and layout diverge on export.
  "MV-KPI-DASHBOARD",
  // The media cover on screen is a full-bleed photo/plate with a scrim and
  // glass-free type; the hand-written renderer paints a gradient band plus a
  // light glass panel, so exports came out light with low-contrast titles.
  "MV-OP-COVER-MEDIA",
  // The dossier cover on screen is an outlined stamp + ref + metadata row; the
  // hand-written renderer draws a filled stamp and a giant rounded frame,
  // which also produced a white-on-aqua contrast failure on export.
  "MV-OP-COVER-DOSSIER",
  "MV-CLOSE-CTA",
  "MV-CLOSE-DUAL-CTA",
  "MV-CLOSE-CONTACT",
  "MV-CLOSE-DECISION",
  "MV-CLOSE-METRIC-PROMISE",
  "MV-CLOSE-QNA",
  "MV-CLOSE-CALENDAR",
  "MV-CLOSE-SPLIT",
  "MV-CLOSE-TIMELINE",
  // Sept 2026 full-library PowerPoint parity sweep (real Office renderer):
  // every variant below scored under the graphic-parity floor against its own
  // on-screen build, so its hand-written OOXML no longer describes the current
  // design. They take the layered route (design-exact plate + measured native
  // text + decomposed native paint), which re-scored at ~0.99 parity while
  // staying editable in PowerPoint.
  "MV-BENTO-5",
  "MV-BENTO-6",
  "MV-BENTO-7",
  "MV-BENTO-8",
  "MV-BENTO-VALUE-CLOSE",
  "MV-CASE-LOGO-GRID",
  "MV-CASE-METRICS",
  "MV-CASE-SPREAD",
  "MV-CLIENT-DETAIL-3",
  "MV-CLIENT-MATRIX",
  "MV-COMM-INVESTMENT",
  "MV-COMM-PRICING",
  "MV-COMPARE-SLIDER",
  "MV-COMPARE-VS-LISTS",
  "MV-DASH-BREAKDOWN",
  "MV-DASH-DONUT-TRIO",
  "MV-DASH-GAUGE-ROW",
  "MV-DASH-GROWTH-COLUMNS",
  "MV-DASH-REGION-STATS",
  "MV-DASH-REPORT-CARDS",
  "MV-DASH-SALES-CHART",
  "MV-DASH-SUMMARY",
  "MV-DEC-COMPARE-TABLE",
  "MV-DEC-MATRIX",
  "MV-FUNNEL",
  "MV-GOV-RACI",
  "MV-GRAPH-AREA-STACK",
  "MV-GRAPH-AXIS-BARS",
  "MV-GRAPH-BUBBLE",
  "MV-GRAPH-DUAL-DONUT",
  "MV-GRAPH-HEATMAP",
  "MV-GRAPH-PERCENT-COMPARE",
  "MV-GRAPH-RINGS",
  "MV-GRAPH-STACKED-BAR",
  "MV-GRAPH-TASK-CARDS",
  "MV-GRAPH-TASK-DIALS",
  "MV-GRAPH-TREEMAP",
  "MV-GRAPH-WATERFALL",
  "MV-HORIZON",
  "MV-ICEBERG",
  "MV-IMG-BEFORE-AFTER",
  "MV-IMG-MATRIX-4",
  "MV-IMG-MATRIX-6",
  "MV-IMG-STRIP",
  "MV-INFO-BAR-COMPARE",
  "MV-INFO-CIRCULAR-FLOW",
  "MV-INFO-DONUT",
  "MV-INFO-FUNNEL",
  "MV-INFO-HUB-PILL-ORBIT",
  "MV-INFO-VENN",
  "MV-JOURNEY-MAP",
  "MV-LOGO-WALL",
  "MV-MATRIX-2X2",
  // MV-MATURITY-CURVE was un-drifted (Oct 2026): its native renderer now
  // carries the subtitle band, the accent area wash under the ramp and the
  // haloed live milestone, so it exports as real editable PowerPoint objects.
  "MV-NUMBERS-TRIPTYCH",
  "MV-OP-COVER-EDITORIAL",
  "MV-OP-COVER-GRADIENT",
  "MV-OP-COVER-GRID",
  "MV-OP-COVER-MONOGRAM",
  "MV-OP-COVER-SPLIT",
  "MV-OP-COVER-STACKED",
  "MV-OP-DIVIDER-NUMBERED",
  "MV-PRINCIPLES",
  "MV-PROC-BEFORE-AFTER",
  "MV-PROC-LAYER-STACK",
  "MV-PROC-PLATFORM-LOOP",
  "MV-PROC-PROOF-PAIRS",
  "MV-RISK-MITIGATION",
  "MV-SOL-ARCHITECTURE",
  "MV-SPLIT-MANIFESTO",
  "MV-TIMELINE-VERTICAL",
];

const DRIFTED_SET = new Set<string>(DRIFTED_NATIVE_RENDERER_IDS);

const NATIVE_VIZ_CHART_SET = new Set<string>(NATIVE_VIZ_VARIANT_IDS);

/**
 * True when the exporter can rebuild this variant natively.
 *
 * MV-VIZ-* used to short-circuit to `true` on the assumption that the embedded
 * spec vector already matched the build. The Sept 2026 Office sweep disproved
 * that (0.55–0.87 graphic parity in light, large ink deltas in dark), so the
 * spec charts now take the layered route like any other drifted renderer.
 */
export function hasNativeVariantEmitter(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  if (DRIFTED_SET.has(variantId)) return false;
  // MV-VIZ-* kinds PowerPoint can draw as a real chart (waterfall, stacked
  // area, radar, slope/bump, gauge grid) export as native `addChart` objects
  // with an embedded worksheet, so they must not be fused into a plate. The
  // remaining viz kinds (sankey, treemap, sunburst, chord, calendar heatmap,
  // market map, beeswarm, dumbbell, gantt, boxplot, radial bar) have no native
  // PowerPoint chart type and keep the design-exact vector plate.
  if (NATIVE_VIZ_CHART_SET.has(variantId)) return true;
  return NATIVE_SET.has(variantId);
}

/**
 * True when the variant can only look right as a design-exact graphic plate
 * (plate + native measured text + decomposed native shapes).
 *
 * EDITABLE-FIRST POLICY: a plate bakes cards, icons, logos and photos into one
 * locked picture, which is exactly what reviewers asked us to stop shipping. So
 * a plate is now used ONLY when there is no hand-written native OOXML renderer
 * for the variant — without it those modules (diagram/map families) would
 * degrade into a plain bulleted list. Everything with a native emitter exports
 * as independent, editable PowerPoint objects over a background plane.
 *
 * Reviewers who explicitly want the pixel-faithful fused look can still pick
 * the "Layered · decor plate" fidelity, which plates every slide.
 */
export function needsGraphicPlate(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  return !hasNativeVariantEmitter(variantId);
}
