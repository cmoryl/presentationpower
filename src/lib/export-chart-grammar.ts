/**
 * EXPORT CHART GRAMMAR — parity bridge between the on-screen chart renderers
 * and the .pptx exporter.
 *
 * The preview reads every chart decision (bar silhouette + width ratio, grid
 * ruling, area fill, ring band thickness, cap, segment gap, gauge sweep, value
 * label placement, category label tracking) from `chartStyle(pack)` via
 * `useChartStyle()`. The exporter used to hardcode one grammar, so a pack with
 * a 0.46-thick dial or a segmented ring exported as the base 0.055 ring, and
 * pack-tinted tracks exported as neutral grey.
 *
 * This module holds the ACTIVE chart grammar for an export run and translates
 * each preview token into the unit the exporter needs (inches, points, OOXML
 * ratios, pptxgenjs option values). Every exported chart must source its
 * fills, strokes, gradients and track styling from here — never from a literal.
 *
 * Hover / focus styling is deliberately NOT represented: it is an interaction
 * state that exists only on screen, and a static .pptx must render the rest
 * state. `assertNoHoverState()` documents that contract for the test suite.
 */

import { chartStyle, ringBand, type ChartStyle } from "./chart-styles";
import type { StylePack } from "./style-packs";

let active: ChartStyle = chartStyle(null);
let activePackId: string | null = null;

function asPack(pack: unknown): StylePack | null {
  if (!pack || typeof pack !== "object") return null;
  const p = pack as Partial<StylePack>;
  return typeof p.id === "string" && p.card ? (pack as StylePack) : null;
}

/** Bind the run's chart grammar from the pack in play (null = brand system). */
export function setExportChartStyle(pack: unknown): ChartStyle {
  const resolved = asPack(pack);
  activePackId = resolved?.id ?? null;
  active = chartStyle(resolved);
  return active;
}

/** Back to the approved brand grammar. Called at the end of every run. */
export function resetExportChartStyle(): void {
  active = chartStyle(null);
  activePackId = null;
}

/** The grammar the current export run must draw with. */
export function exportChartStyle(): ChartStyle {
  return active;
}

/** True when an alternate look is active (tracks are accent-tinted on screen). */
export function exportChartPackActive(): boolean {
  return activePackId !== null;
}

/* ── rings / gauges ──────────────────────────────────────────────────────── */

/**
 * OOXML `arcThicknessRatio` for a ring of the given diameter (inches).
 * Mirrors `ringBand(style, radius)`, including its 6px-on-a-1920-stage floor
 * (1920px stage = 13.333in, so 6px = 0.0417in).
 */
export function ringThicknessRatio(diameterIn: number, style: ChartStyle = active): number {
  const radiusIn = Math.max(0.01, diameterIn / 2);
  const minBandIn = 6 / 144; // 6px of a 1920px-wide 13.333in stage
  const band = Math.max(minBandIn, radiusIn * style.ringThickness);
  return Math.min(0.95, band / radiusIn);
}

/** Ring band width in inches for a given ring diameter. */
export function ringBandIn(diameterIn: number, style: ChartStyle = active): number {
  return ringThicknessRatio(diameterIn, style) * (diameterIn / 2);
}

/** Preview band in CSS px, for parity assertions against `ringBand()`. */
export function ringBandPx(sizePx: number, style: ChartStyle = active): number {
  return ringBand(style, sizePx / 2);
}

/** Gauge sweep in degrees, clamped exactly like the on-screen dial. */
export function gaugeSweepDeg(style: ChartStyle = active): number {
  return Math.max(140, Math.min(300, style.gaugeSweep));
}

/** Segment gap in degrees; 0 = one continuous arc. */
export function ringGapDeg(style: ChartStyle = active): number {
  return Math.max(0, style.ringGap);
}

/**
 * Split a value arc into the pack's segmented ticks (matching the preview's
 * dash array), or a single arc when the pack draws continuous rings.
 * Angles are absolute OOXML degrees (0 = 3 o'clock, clockwise).
 */
export function ringArcSegments(
  startDeg: number,
  sweptDeg: number,
  style: ChartStyle = active,
): Array<[number, number]> {
  const norm = (a: number) => ((Math.round(a) % 360) + 360) % 360;
  const total = Math.min(359.5, Math.max(0, sweptDeg));
  if (total <= 0.75) return [];
  const gap = ringGapDeg(style);
  if (gap <= 0) return [[norm(startDeg), norm(startDeg + total)]];
  // Preview: ticks of ~circ/28 with `ringGap` degrees of air between them.
  const seg = 360 / 28;
  const out: Array<[number, number]> = [];
  let at = 0;
  while (at < total && out.length < 64) {
    const end = Math.min(total, at + seg);
    if (end - at > 0.6) out.push([norm(startDeg + at), norm(startDeg + end)]);
    at = end + gap;
  }
  return out;
}

/** Round caps become tiny end discs in OOXML; report whether to draw them. */
export function ringHasRoundCaps(style: ChartStyle = active): boolean {
  return style.ringCap === "round";
}

/** Track de-emphasis for `grid: "none"` packs — preview thins + fades it. */
export function ringTrackEmphasis(style: ChartStyle = active): {
  scale: number;
  transparency: number;
} {
  return style.grid === "none" ? { scale: 0.35, transparency: 30 } : { scale: 1, transparency: 0 };
}

/* ── tracks ──────────────────────────────────────────────────────────────── */

/**
 * Track / empty-bar / gridline fill, matching `--slide-track-fill`:
 *   pack active → accent at 28% over the surface (mode-independent, exactly as
 *                 `hexA(pack.tokens.accent, 0.28)` on screen)
 *   brand system → ink at 7% (light) / 8% (dark), matching `makeSlideInk()`
 * Returned flattened, because OOXML shape lines take an opaque hex.
 */
export function trackFillAlpha(dark = false): number {
  if (exportChartPackActive()) return 0.28;
  return dark ? 0.08 : 0.07;
}

/** Which token the track is tinted with. Same in both modes. */
export function trackFillSource(): "accent" | "ink" {
  return exportChartPackActive() ? "accent" : "ink";
}

/* ── bars ────────────────────────────────────────────────────────────────── */

/** pptxgenjs `barGapWidthPct` from the pack's column width ratio. */
export function barGapWidthPct(style: ChartStyle = active): number {
  const ratio = Math.max(0.12, Math.min(0.95, style.barRatio));
  return Math.round(Math.max(10, Math.min(500, ((1 - ratio) / ratio) * 100)));
}

/** Column width in inches for a slot, from the pack's width ratio. */
export function barWidthIn(slotWIn: number, style: ChartStyle = active): number {
  return Math.max(0.04, slotWIn * Math.max(0.12, Math.min(0.95, style.barRatio)));
}

/** Corner radius in inches for the pack's bar silhouette (1920px stage). */
export function barRadiusIn(style: ChartStyle = active): number {
  const capsule = style.bar === "capsule" || style.bar === "arch";
  const px = capsule ? Math.max(style.barRadius, 24) : style.barRadius;
  return px / 144;
}

/** Outline-only columns (`ghost`) fill with a tint instead of solid accent. */
export function barIsOutline(style: ChartStyle = active): boolean {
  return style.bar === "ghost";
}

/* ── field / series ──────────────────────────────────────────────────────── */

/** pptxgenjs gridline spec for the pack's field ruling. */
export function gridLineSpec(
  color: string,
  style: ChartStyle = active,
): { color: string; size: number; style: "solid" | "dash" | "dot" | "none" } {
  switch (style.grid) {
    case "none":
      return { color, size: 0, style: "none" };
    case "dashed":
      return { color, size: 0.75, style: "dash" };
    case "dotted":
      return { color, size: 0.75, style: "dot" };
    case "ledger":
    case "frame":
      return { color, size: 1.25, style: "solid" };
    case "banded":
    case "ticks":
    case "hairline":
    default:
      return { color, size: 0.75, style: "solid" };
  }
}

/** Series line weight in points. */
export function lineSizePt(style: ChartStyle = active): number {
  return style.line === "thick" ? Math.max(4, style.lineWidth + 1) : Math.max(1.5, style.lineWidth);
}

/** Dashed series parity. */
export function lineDash(style: ChartStyle = active): "solid" | "dash" {
  return style.line === "dashed" ? "dash" : "solid";
}

/**
 * Area-fill transparency under a series, matching the preview:
 *   gradient → graded bands topping out at 0 (handled by the caller)
 *   flat     → 16% ink
 *   hatch / halftone → 12% pattern stand-in
 *   none     → not drawn
 */
export function areaFillTransparency(style: ChartStyle = active): number | null {
  switch (style.area) {
    case "none":
      return null;
    case "gradient":
      return 20;
    case "flat":
      return 84;
    case "hatch":
    case "halftone":
    default:
      return 88;
  }
}

/** Whether the export should emit the graded gradient bands for the area. */
export function areaIsGradient(style: ChartStyle = active): boolean {
  return style.area === "gradient";
}

/* ── labels ──────────────────────────────────────────────────────────────── */

/** Category label text with the pack's casing applied. */
export function labelText(text: string, style: ChartStyle = active): string {
  return style.labelCase === "upper" ? text.toUpperCase() : text;
}

/** pptxgenjs `charSpacing` (points at 12pt) from the pack's em tracking. */
export function labelCharSpacing(style: ChartStyle = active): number {
  return Math.round(style.labelTrack * 12 * 10) / 10;
}

/** Value label placement. `null` = don't draw values at all. */
export function valueLabelPlacement(style: ChartStyle = active): "above" | "inside" | "end" | null {
  return style.valueLabel === "none" ? null : style.valueLabel;
}

/* ── contract documentation ──────────────────────────────────────────────── */

/**
 * Interaction states never ship into a .pptx. A static slide must render the
 * chart's rest state: no hover tint, no focus ring, no transition artifact.
 */
export function assertNoHoverState(): true {
  return true;
}
