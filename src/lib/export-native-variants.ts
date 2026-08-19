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
  "MV-PROOF-LOGOS-STRIP",
  "MV-PROOF-LOGOS-MARQUEE",
  "MV-PROOF-LOGOS-FEATURED",
  "MV-PROOF-LOGOS-CATEGORIZED",
  "MV-PROOF-LOGOS-MOSAIC",
  "MV-PROOF-TESTIMONIAL",
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
  "MV-QUOTE-PORTRAIT",
  "MV-QUOTE-POSTER",
  "MV-QUOTE-METRIC",
  "MV-QUOTE-MULTI",
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

const DRIFTED_SET = new Set<string>(DRIFTED_NATIVE_RENDERER_IDS);

/**
 * True when the exporter can rebuild this variant natively (or already embeds a
 * vector for it, as with the spec-driven MV-VIZ-* infographics).
 */
export function hasNativeVariantEmitter(variantId: string | undefined | null): boolean {
  if (!variantId) return false;
  if (variantId.startsWith("MV-VIZ-")) return true;
  if (DRIFTED_SET.has(variantId)) return false;
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
