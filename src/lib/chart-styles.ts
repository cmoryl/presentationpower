/**
 * CHART STYLES — per-skin data-visual languages.
 *
 * Design review finding: alternate looks re-skinned the *palette* of every
 * chart but kept one shared chart grammar — same 2px-radius bars, same single
 * baseline, same donut thickness, same value labels floating above the bar. So
 * a dashboard slide in skin S04 read as the same dashboard as S22.
 *
 * This module gives every catalog language (S01–S28) and every industry pack
 * (R01–R30) its OWN chart grammar:
 *
 *   • BAR      — column silhouette, width ratio and corner language.
 *   • FIELD    — how the plot field is ruled (grid) and axed.
 *   • SERIES   — line curve, weight, area fill and marker shape.
 *   • RING     — donut/gauge thickness, cap, gap and sweep.
 *   • LABEL    — where values sit, and how category labels are typeset.
 *
 * Resolution is deterministic: catalog/industry packs get a hand-assigned
 * sheet, anything else falls back to a stable hash of the pack id blended with
 * its card geometry, so a look always renders the same chart language across
 * previews, lookbook, live slides and export.
 */

import type { StylePack } from "./style-packs";

/** Column silhouette. */
export type BarShape =
  | "block" // hard rectangle
  | "round" // soft top corners
  | "capsule" // fully rounded column
  | "taper" // narrows towards the top
  | "notch" // cut top-right corner
  | "chamfer" // both top corners cut
  | "step" // stepped shoulder
  | "split" // column split by a mid gap
  | "pin" // thin stem with a cap plate
  | "ghost" // outline only, tinted fill
  | "slab" // wide column with offset drop
  | "tick" // very thin bar, tall label
  | "arch" // half-round top
  | "flag"; // asymmetric top slice

/** How the plot field is ruled. */
export type GridStyle =
  | "none"
  | "hairline"
  | "dashed"
  | "dotted"
  | "banded" // alternating tint rows
  | "ledger" // strong horizontal rules
  | "ticks" // short marks at the axis
  | "frame"; // rules plus an outer box

export type AxisStyle = "baseline" | "spine" | "boxed" | "none" | "floating";
export type LineStyle = "smooth" | "linear" | "step" | "dashed" | "thick";
export type AreaFill = "gradient" | "flat" | "hatch" | "none" | "halftone";
export type MarkerStyle = "none" | "dot" | "square" | "diamond" | "tick" | "hollow";
export type ValueLabel = "above" | "inside" | "end" | "none";
export type RingCap = "flat" | "round";
export type ChartPlate = "none" | "tint" | "outline" | "inset";

export interface ChartStyle {
  bar: BarShape;
  /** Fraction of the slot the column occupies (0.2 airy → 0.9 packed). */
  barRatio: number;
  /** Base corner radius for round/arch languages. */
  barRadius: number;
  grid: GridStyle;
  axis: AxisStyle;
  line: LineStyle;
  lineWidth: number;
  area: AreaFill;
  marker: MarkerStyle;
  valueLabel: ValueLabel;
  /** Donut/ring band thickness as a fraction of the radius. */
  ringThickness: number;
  ringCap: RingCap;
  /** Degrees of empty space between ring segments. */
  ringGap: number;
  /** Gauge sweep in degrees (180 = semi, 270 = three-quarter dial). */
  gaugeSweep: number;
  labelCase: "upper" | "none";
  /** Letter-spacing in em for category labels. */
  labelTrack: number;
  plate: ChartPlate;
}

const BASE: ChartStyle = {
  bar: "round",
  barRatio: 0.5,
  barRadius: 2,
  grid: "hairline",
  axis: "baseline",
  line: "smooth",
  lineWidth: 3,
  area: "gradient",
  marker: "none",
  valueLabel: "above",
  ringThickness: 0.26,
  ringCap: "flat",
  ringGap: 0,
  gaugeSweep: 180,
  labelCase: "upper",
  labelTrack: 0.14,
  plate: "none",
};

/** The approved brand system's chart grammar (no pack active). */
export const BRAND_CHART_STYLE: ChartStyle = { ...BASE };

const def = (s: Partial<ChartStyle>): ChartStyle => ({ ...BASE, ...s });

/**
 * HAND-ASSIGNED CHART SHEET for the catalog languages S01–S28.
 * Invariants (see src/lib/__tests__/chart-styles.test.ts):
 *   • every skin owns a (bar, grid) pair no other skin uses;
 *   • no two skins share the same (line, area, marker) series signature;
 *   • ring thickness / gauge sweep vary so dials never twin.
 */
export const SKIN_CHART_STYLES: Record<string, ChartStyle> = {
  S01: def({ bar: "round", grid: "hairline", axis: "baseline", line: "smooth", area: "gradient", marker: "none", ringThickness: 0.24, gaugeSweep: 180, barRatio: 0.46 }),
  S02: def({ bar: "capsule", grid: "dotted", axis: "none", line: "smooth", area: "flat", marker: "dot", ringThickness: 0.18, ringCap: "round", ringGap: 6, gaugeSweep: 200, barRatio: 0.34, barRadius: 40, labelCase: "none", labelTrack: 0.02, valueLabel: "end" }),
  S03: def({ bar: "block", grid: "ledger", axis: "spine", line: "linear", area: "hatch", marker: "square", ringThickness: 0.34, gaugeSweep: 180, barRatio: 0.62, plate: "outline", valueLabel: "inside" }),
  S04: def({ bar: "notch", grid: "banded", axis: "boxed", line: "step", area: "flat", marker: "tick", ringThickness: 0.3, ringGap: 3, gaugeSweep: 240, barRatio: 0.7, plate: "tint" }),
  S05: def({ bar: "tick", grid: "ledger", axis: "baseline", line: "thick", area: "none", marker: "hollow", ringThickness: 0.12, gaugeSweep: 180, barRatio: 0.18, labelCase: "none", labelTrack: 0.04, valueLabel: "above" }),
  S06: def({ bar: "ghost", grid: "hairline", axis: "spine", line: "dashed", area: "halftone", marker: "diamond", ringThickness: 0.2, gaugeSweep: 220, barRatio: 0.58, plate: "inset" }),
  S07: def({ bar: "chamfer", grid: "frame", axis: "boxed", line: "linear", area: "none", marker: "diamond", ringThickness: 0.28, ringGap: 4, gaugeSweep: 270, barRatio: 0.44, labelTrack: 0.22 }),
  S08: def({ bar: "arch", grid: "dotted", axis: "baseline", line: "smooth", area: "gradient", marker: "dot", ringThickness: 0.36, ringCap: "round", gaugeSweep: 190, barRatio: 0.52, barRadius: 26 }),
  S09: def({ bar: "split", grid: "ticks", axis: "floating", line: "step", area: "hatch", marker: "none", ringThickness: 0.16, ringGap: 8, gaugeSweep: 210, barRatio: 0.6, valueLabel: "end" }),
  S10: def({ bar: "pin", grid: "none", axis: "none", line: "smooth", area: "halftone", marker: "hollow", ringThickness: 0.1, ringCap: "round", gaugeSweep: 260, barRatio: 0.24, labelCase: "none", labelTrack: 0.01 }),
  S11: def({ bar: "slab", grid: "banded", axis: "spine", line: "thick", area: "flat", marker: "square", ringThickness: 0.42, gaugeSweep: 180, barRatio: 0.82, plate: "tint", valueLabel: "inside" }),
  S12: def({ bar: "step", grid: "dashed", axis: "baseline", line: "step", area: "none", marker: "tick", ringThickness: 0.22, ringGap: 2, gaugeSweep: 230, barRatio: 0.56 }),
  S13: def({ bar: "round", grid: "dotted", axis: "floating", line: "smooth", area: "hatch", marker: "diamond", ringThickness: 0.32, ringCap: "round", ringGap: 5, gaugeSweep: 200, barRatio: 0.48, barRadius: 12 }),
  S14: def({ bar: "flag", grid: "none", axis: "spine", line: "linear", area: "flat", marker: "none", ringThickness: 0.38, gaugeSweep: 250, barRatio: 0.74, plate: "outline", valueLabel: "inside", labelTrack: 0.3 }),
  S15: def({ bar: "taper", grid: "ticks", axis: "baseline", line: "dashed", area: "gradient", marker: "square", ringThickness: 0.26, ringGap: 7, gaugeSweep: 180, barRatio: 0.5 }),
  S16: def({ bar: "capsule", grid: "hairline", axis: "floating", line: "smooth", area: "none", marker: "tick", ringThickness: 0.14, ringCap: "round", gaugeSweep: 270, barRatio: 0.3, barRadius: 40, valueLabel: "end", labelCase: "none", labelTrack: 0.03 }),
  S17: def({ bar: "arch", grid: "banded", axis: "none", line: "thick", area: "halftone", marker: "dot", ringThickness: 0.34, ringCap: "round", ringGap: 4, gaugeSweep: 210, barRatio: 0.54, barRadius: 30, plate: "tint" }),
  S18: def({ bar: "chamfer", grid: "ledger", axis: "boxed", line: "dashed", area: "flat", marker: "hollow", ringThickness: 0.24, gaugeSweep: 240, barRatio: 0.42, labelTrack: 0.18 }),
  S19: def({ bar: "slab", grid: "ticks", axis: "spine", line: "step", area: "gradient", marker: "diamond", ringThickness: 0.4, gaugeSweep: 180, barRatio: 0.78, valueLabel: "inside", plate: "inset" }),
  S20: def({ bar: "pin", grid: "dashed", axis: "floating", line: "smooth", area: "flat", marker: "hollow", ringThickness: 0.12, ringCap: "round", ringGap: 9, gaugeSweep: 265, barRatio: 0.22 }),
  S21: def({ bar: "block", grid: "frame", axis: "boxed", line: "thick", area: "hatch", marker: "tick", ringThickness: 0.3, gaugeSweep: 195, barRatio: 0.66, plate: "outline", valueLabel: "above" }),
  S22: def({ bar: "split", grid: "hairline", axis: "baseline", line: "dashed", area: "none", marker: "dot", ringThickness: 0.2, ringGap: 6, gaugeSweep: 225, barRatio: 0.58, labelCase: "none", labelTrack: 0.05 }),
  S23: def({ bar: "flag", grid: "dotted", axis: "spine", line: "linear", area: "halftone", marker: "square", ringThickness: 0.44, gaugeSweep: 255, barRatio: 0.8, valueLabel: "end", labelTrack: 0.26 }),
  S24: def({ bar: "taper", grid: "ledger", axis: "floating", line: "smooth", area: "flat", marker: "none", ringThickness: 0.28, ringCap: "round", gaugeSweep: 185, barRatio: 0.5, plate: "tint" }),
  S25: def({ bar: "step", grid: "banded", axis: "none", line: "linear", area: "gradient", marker: "hollow", ringThickness: 0.36, ringGap: 3, gaugeSweep: 235, barRatio: 0.68, valueLabel: "inside" }),
  S26: def({ bar: "ghost", grid: "frame", axis: "spine", line: "step", area: "flat", marker: "diamond", ringThickness: 0.46, gaugeSweep: 180, barRatio: 0.72, plate: "inset", labelTrack: 0.2 }),
  S27: def({ bar: "notch", grid: "ticks", axis: "boxed", line: "smooth", area: "hatch", marker: "hollow", ringThickness: 0.22, ringGap: 5, gaugeSweep: 215, barRatio: 0.6 }),
  S28: def({ bar: "tick", grid: "none", axis: "baseline", line: "dashed", area: "gradient", marker: "tick", ringThickness: 0.15, gaugeSweep: 270, barRatio: 0.2, labelCase: "none", labelTrack: 0.02, valueLabel: "end" }),
};

/**
 * INDUSTRY CHART SHEET (R01–R30) — full-info decks, so grids are denser,
 * columns wider and value labels almost always present. Deliberately disjoint
 * from the catalog sheet on the (bar, grid) pair.
 */
export const INDUSTRY_CHART_STYLES: Record<string, ChartStyle> = {
  R01: def({ bar: "block", grid: "banded", axis: "spine", line: "linear", area: "flat", marker: "square", ringThickness: 0.31, gaugeSweep: 182, barRatio: 0.68, valueLabel: "inside", plate: "tint" }),
  R02: def({ bar: "tick", grid: "ticks", axis: "baseline", line: "thick", area: "none", marker: "tick", ringThickness: 0.13, gaugeSweep: 268, barRatio: 0.19, labelCase: "none", labelTrack: 0.03 }),
  R03: def({ bar: "capsule", grid: "banded", axis: "floating", line: "smooth", area: "gradient", marker: "dot", ringThickness: 0.19, ringCap: "round", ringGap: 6, gaugeSweep: 205, barRatio: 0.36, barRadius: 40 }),
  R04: def({ bar: "arch", grid: "hairline", axis: "none", line: "smooth", area: "halftone", marker: "hollow", ringThickness: 0.35, ringCap: "round", gaugeSweep: 192, barRatio: 0.55, barRadius: 28 }),
  R05: def({ bar: "chamfer", grid: "ticks", axis: "boxed", line: "step", area: "hatch", marker: "diamond", ringThickness: 0.27, ringGap: 4, gaugeSweep: 245, barRatio: 0.46, labelTrack: 0.2 }),
  R06: def({ bar: "slab", grid: "ledger", axis: "spine", line: "thick", area: "flat", marker: "none", ringThickness: 0.43, gaugeSweep: 180, barRatio: 0.84, valueLabel: "inside", plate: "outline" }),
  R07: def({ bar: "split", grid: "banded", axis: "boxed", line: "linear", area: "gradient", marker: "square", ringThickness: 0.21, ringGap: 8, gaugeSweep: 228, barRatio: 0.62, plate: "tint" }),
  R08: def({ bar: "round", grid: "dotted", axis: "baseline", line: "smooth", area: "flat", marker: "diamond", ringThickness: 0.3, ringCap: "round", gaugeSweep: 198, barRatio: 0.5, barRadius: 10 }),
  R09: def({ bar: "notch", grid: "frame", axis: "spine", line: "step", area: "halftone", marker: "tick", ringThickness: 0.33, gaugeSweep: 252, barRatio: 0.72, plate: "inset" }),
  R10: def({ bar: "taper", grid: "ledger", axis: "boxed", line: "dashed", area: "none", marker: "dot", ringThickness: 0.25, ringGap: 5, gaugeSweep: 186, barRatio: 0.52, valueLabel: "end" }),
  R11: def({ bar: "ghost", grid: "ticks", axis: "floating", line: "linear", area: "hatch", marker: "hollow", ringThickness: 0.17, gaugeSweep: 262, barRatio: 0.66, plate: "outline" }),
  R12: def({ bar: "flag", grid: "dashed", axis: "spine", line: "thick", area: "gradient", marker: "none", ringThickness: 0.45, gaugeSweep: 218, barRatio: 0.8, valueLabel: "inside", labelTrack: 0.28 }),
  R13: def({ bar: "step", grid: "hairline", axis: "none", line: "smooth", area: "hatch", marker: "square", ringThickness: 0.29, ringCap: "round", ringGap: 3, gaugeSweep: 208, barRatio: 0.58 }),
  R14: def({ bar: "pin", grid: "banded", axis: "none", line: "dashed", area: "halftone", marker: "diamond", ringThickness: 0.11, ringCap: "round", gaugeSweep: 256, barRatio: 0.25, labelCase: "none", labelTrack: 0.02 }),
  R15: def({ bar: "block", grid: "dotted", axis: "floating", line: "step", area: "flat", marker: "hollow", ringThickness: 0.37, gaugeSweep: 232, barRatio: 0.7, valueLabel: "inside", plate: "tint" }),
  R16: def({ bar: "capsule", grid: "ledger", axis: "boxed", line: "linear", area: "none", marker: "tick", ringThickness: 0.16, ringCap: "round", gaugeSweep: 272, barRatio: 0.32, barRadius: 40, valueLabel: "end" }),
  R17: def({ bar: "arch", grid: "frame", axis: "spine", line: "thick", area: "hatch", marker: "dot", ringThickness: 0.39, ringCap: "round", ringGap: 4, gaugeSweep: 188, barRatio: 0.6, barRadius: 32, plate: "outline" }),
  R18: def({ bar: "chamfer", grid: "banded", axis: "none", line: "dashed", area: "flat", marker: "none", ringThickness: 0.23, gaugeSweep: 242, barRatio: 0.48, labelTrack: 0.19 }),
  R19: def({ bar: "notch", grid: "hairline", axis: "boxed", line: "smooth", area: "gradient", marker: "square", ringThickness: 0.32, ringGap: 6, gaugeSweep: 202, barRatio: 0.64, plate: "inset" }),
  R20: def({ bar: "taper", grid: "dotted", axis: "spine", line: "thick", area: "halftone", marker: "tick", ringThickness: 0.28, gaugeSweep: 222, barRatio: 0.54 }),
  R21: def({ bar: "split", grid: "frame", axis: "baseline", line: "step", area: "flat", marker: "hollow", ringThickness: 0.2, ringGap: 7, gaugeSweep: 250, barRatio: 0.6, plate: "tint" }),
  R22: def({ bar: "slab", grid: "dashed", axis: "boxed", line: "smooth", area: "hatch", marker: "diamond", ringThickness: 0.47, gaugeSweep: 184, barRatio: 0.86, valueLabel: "inside" }),
  R23: def({ bar: "flag", grid: "ticks", axis: "none", line: "linear", area: "none", marker: "dot", ringThickness: 0.41, gaugeSweep: 238, barRatio: 0.76, labelTrack: 0.24, valueLabel: "end" }),
  R24: def({ bar: "round", grid: "banded", axis: "spine", line: "dashed", area: "hatch", marker: "none", ringThickness: 0.26, ringCap: "round", ringGap: 2, gaugeSweep: 196, barRatio: 0.5, barRadius: 14 }),
  R25: def({ bar: "step", grid: "frame", axis: "floating", line: "thick", area: "gradient", marker: "diamond", ringThickness: 0.34, gaugeSweep: 258, barRatio: 0.66, plate: "outline", valueLabel: "inside" }),
  R26: def({ bar: "ghost", grid: "ledger", axis: "none", line: "smooth", area: "flat", marker: "tick", ringThickness: 0.18, gaugeSweep: 214, barRatio: 0.62, plate: "inset" }),
  R27: def({ bar: "pin", grid: "hairline", axis: "boxed", line: "step", area: "gradient", marker: "hollow", ringThickness: 0.14, ringCap: "round", ringGap: 9, gaugeSweep: 266, barRatio: 0.26 }),
  R28: def({ bar: "tick", grid: "dashed", axis: "floating", line: "linear", area: "halftone", marker: "square", ringThickness: 0.15, gaugeSweep: 226, barRatio: 0.21, labelCase: "none", labelTrack: 0.04, valueLabel: "above" }),
  R29: def({ bar: "block", grid: "ticks", axis: "spine", line: "dashed", area: "gradient", marker: "hollow", ringThickness: 0.36, gaugeSweep: 206, barRatio: 0.74, valueLabel: "inside", plate: "tint" }),
  R30: def({ bar: "arch", grid: "ledger", axis: "floating", line: "step", area: "none", marker: "dot", ringThickness: 0.38, ringCap: "round", gaugeSweep: 248, barRatio: 0.56, barRadius: 34 }),
};

const BARS: BarShape[] = ["block", "round", "capsule", "taper", "notch", "chamfer", "step", "split", "pin", "ghost", "slab", "tick", "arch", "flag"];
const GRIDS: GridStyle[] = ["none", "hairline", "dashed", "dotted", "banded", "ledger", "ticks", "frame"];
const AXES: AxisStyle[] = ["baseline", "spine", "boxed", "none", "floating"];
const LINES: LineStyle[] = ["smooth", "linear", "step", "dashed", "thick"];
const AREAS: AreaFill[] = ["gradient", "flat", "hatch", "none", "halftone"];
const MARKERS: MarkerStyle[] = ["none", "dot", "square", "diamond", "tick", "hollow"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Skin/industry code embedded in a pack id, e.g. "skin-s04" → "S04". */
export function chartSheetKey(packId: string): string | null {
  const m = /(?:^|[-_])([sr])(\d{2})$/i.exec(packId.trim());
  if (!m) return null;
  return `${m[1]!.toUpperCase()}${m[2]}`;
}

/** Resolve the chart grammar for a pack (null = approved brand system). */
export function chartStyle(pack: StylePack | null | undefined): ChartStyle {
  if (!pack) return BRAND_CHART_STYLE;
  const key = chartSheetKey(pack.id);
  if (key && SKIN_CHART_STYLES[key]) return SKIN_CHART_STYLES[key]!;
  if (key && INDUSTRY_CHART_STYLES[key]) return INDUSTRY_CHART_STYLES[key]!;
  const h = hash(pack.id);
  const hard = pack.card.radius <= 4;
  const barPool = hard
    ? (["block", "notch", "chamfer", "step", "split", "slab", "flag", "tick", "ghost"] as BarShape[])
    : (["round", "capsule", "taper", "arch", "pin", "ghost", "round"] as BarShape[]);
  return def({
    bar: barPool[h % barPool.length]!,
    barRatio: 0.28 + ((h >> 3) % 7) * 0.09,
    barRadius: hard ? 0 : 4 + ((h >> 5) % 6) * 5,
    grid: GRIDS[(h >> 2) % GRIDS.length]!,
    axis: AXES[(h >> 4) % AXES.length]!,
    line: LINES[(h >> 6) % LINES.length]!,
    area: AREAS[(h >> 8) % AREAS.length]!,
    marker: MARKERS[(h >> 10) % MARKERS.length]!,
    valueLabel: (["above", "inside", "end"] as ValueLabel[])[(h >> 12) % 3]!,
    ringThickness: 0.12 + ((h >> 14) % 8) * 0.045,
    ringCap: hard ? "flat" : "round",
    ringGap: (h >> 16) % 9,
    gaugeSweep: 180 + ((h >> 18) % 10) * 10,
    labelCase: hard ? "upper" : "none",
    labelTrack: hard ? 0.18 : 0.04,
    plate: (["none", "tint", "outline", "inset"] as ChartPlate[])[(h >> 20) % 4]!,
  });
}

/* ── geometry helpers ─────────────────────────────────────────────────── */

/**
 * SVG path for a single column in the pack's bar language. `x/y/w/h` describe
 * the plain rectangle; the returned path is the styled silhouette.
 */
export function barPath(style: ChartStyle, x: number, y: number, w: number, h: number): string {
  const H = Math.max(h, 0.5);
  const b = y + H;
  const r = Math.min(style.barRadius, w / 2, H);
  switch (style.bar) {
    case "capsule": {
      const cr = Math.min(w / 2, H / 2);
      return `M${x} ${b - cr} A${cr} ${cr} 0 0 1 ${x + w} ${b - cr} L${x + w} ${y + cr} A${cr} ${cr} 0 0 0 ${x} ${y + cr} Z`;
    }
    case "arch": {
      const cr = Math.min(w / 2, H);
      return `M${x} ${b} L${x} ${y + cr} A${cr} ${cr} 0 0 1 ${x + w} ${y + cr} L${x + w} ${b} Z`;
    }
    case "round":
      return `M${x} ${b} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${b} Z`;
    case "taper": {
      const inset = w * 0.22;
      return `M${x} ${b} L${x + inset} ${y} L${x + w - inset} ${y} L${x + w} ${b} Z`;
    }
    case "notch": {
      const c = Math.min(w * 0.34, H * 0.34, 18);
      return `M${x} ${b} L${x} ${y} L${x + w - c} ${y} L${x + w} ${y + c} L${x + w} ${b} Z`;
    }
    case "chamfer": {
      const c = Math.min(w * 0.28, H * 0.28, 16);
      return `M${x} ${b} L${x} ${y + c} L${x + c} ${y} L${x + w - c} ${y} L${x + w} ${y + c} L${x + w} ${b} Z`;
    }
    case "step": {
      const sh = Math.min(H * 0.3, 26);
      const sw = w * 0.42;
      return `M${x} ${b} L${x} ${y + sh} L${x + sw} ${y + sh} L${x + sw} ${y} L${x + w} ${y} L${x + w} ${b} Z`;
    }
    case "flag": {
      const c = Math.min(H * 0.34, 34);
      return `M${x} ${b} L${x} ${y + c} L${x + w} ${y} L${x + w} ${b} Z`;
    }
    case "slab":
    case "block":
    case "ghost":
    case "tick":
    case "split":
    case "pin":
    default:
      return `M${x} ${b} L${x} ${y} L${x + w} ${y} L${x + w} ${b} Z`;
  }
}

/** Extra marks drawn with a column: split gap, pin cap, slab drop. */
export interface BarOrnament {
  /** Rect knocked out of the column (split language). */
  cut?: { x: number; y: number; w: number; h: number };
  /** Cap plate on top of the column (pin language). */
  cap?: { x: number; y: number; w: number; h: number };
  /** Offset drop behind the column (slab language). */
  drop?: { x: number; y: number; w: number; h: number };
}

export function barOrnament(
  style: ChartStyle,
  x: number,
  y: number,
  w: number,
  h: number,
): BarOrnament {
  if (style.bar === "split" && h > 40) {
    const gap = Math.min(10, h * 0.08);
    return { cut: { x, y: y + h * 0.46, w, h: gap } };
  }
  if (style.bar === "pin") {
    const capH = Math.min(10, Math.max(5, h * 0.05));
    return { cap: { x: x - w * 0.6, y, w: w * 2.2, h: capH } };
  }
  if (style.bar === "slab") return { drop: { x: x + 6, y: y + 6, w, h } };
  return {};
}

/** Effective column width for a slot in this language. */
export function barWidth(style: ChartStyle, slot: number): number {
  const ratio =
    style.bar === "tick" ? Math.min(style.barRatio, 0.22) : style.bar === "pin" ? Math.min(style.barRatio, 0.3) : style.barRatio;
  return Math.max(3, slot * ratio);
}

export interface GridLine {
  y: number;
  dash?: string;
  opacity: number;
  width: number;
}

/** Horizontal rules for the plot field, in the pack's ruling language. */
export function gridLines(style: ChartStyle, top: number, bottom: number, count = 4): GridLine[] {
  if (style.grid === "none" || style.grid === "ticks") return [];
  const rows: GridLine[] = [];
  const span = bottom - top;
  const n = style.grid === "ledger" ? Math.max(count, 5) : count;
  for (let i = 1; i <= n; i++) {
    const y = bottom - (span * i) / (n + 1);
    rows.push({
      y,
      dash:
        style.grid === "dashed" ? "10 8" : style.grid === "dotted" ? "1 7" : undefined,
      opacity: style.grid === "ledger" ? 0.55 : style.grid === "banded" ? 0.18 : 0.32,
      width: style.grid === "ledger" ? 1.4 : 1,
    });
  }
  return rows;
}

/** Alternating tint bands (banded ruling only). */
export function gridBands(
  style: ChartStyle,
  top: number,
  bottom: number,
  count = 4,
): { y: number; h: number }[] {
  if (style.grid !== "banded") return [];
  const bands: { y: number; h: number }[] = [];
  const step = (bottom - top) / (count + 1);
  for (let i = 0; i <= count; i += 2) bands.push({ y: top + i * step, h: step });
  return bands;
}

/** Stroke dash pattern for a series line. */
export function lineDash(style: ChartStyle): string | undefined {
  return style.line === "dashed" ? "14 10" : undefined;
}

export function lineWeight(style: ChartStyle, base = 3): number {
  return style.line === "thick" ? base * 1.9 : style.line === "dashed" ? base * 0.9 : base;
}

/** Build a polyline/curve path in the pack's series language. */
export function seriesPath(
  style: ChartStyle,
  pts: { x: number; y: number }[],
  tension = 0.32,
): string {
  if (!pts.length) return "";
  const first = pts[0]!;
  if (pts.length === 1) return `M${first.x} ${first.y}`;
  if (style.line === "step") {
    let d = `M${first.x} ${first.y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i]!;
      const prev = pts[i - 1]!;
      const mx = (prev.x + p.x) / 2;
      d += ` L${mx} ${prev.y} L${mx} ${p.y} L${p.x} ${p.y}`;
    }
    return d;
  }
  if (style.line !== "smooth") {
    return pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  }
  let d = `M${first.x} ${first.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * (tension / 0.32) * 0.32 * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * (tension / 0.32) * 0.32 * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * (tension / 0.32) * 0.32 * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * (tension / 0.32) * 0.32 * 2;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Marker size for the pack's marker language (0 = draw nothing). */
export function markerSize(style: ChartStyle, base = 6): number {
  switch (style.marker) {
    case "none":
      return 0;
    case "tick":
      return base * 1.4;
    case "diamond":
      return base * 1.15;
    default:
      return base;
  }
}

/** Path for one marker centred on x/y. */
export function markerPath(style: ChartStyle, x: number, y: number, size: number): string {
  const s = size;
  switch (style.marker) {
    case "square":
    case "hollow":
      return `M${x - s} ${y - s} L${x + s} ${y - s} L${x + s} ${y + s} L${x - s} ${y + s} Z`;
    case "diamond":
      return `M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z`;
    case "tick":
      return `M${x} ${y - s} L${x} ${y + s}`;
    case "dot":
    default:
      return `M${x - s} ${y} A${s} ${s} 0 1 0 ${x + s} ${y} A${s} ${s} 0 1 0 ${x - s} ${y} Z`;
  }
}

/** Ring band width in px for a given radius. */
export function ringBand(style: ChartStyle, radius: number): number {
  return Math.max(6, radius * style.ringThickness);
}

/** Label typography for chart categories. */
export function labelType(style: ChartStyle): {
  textTransform: "uppercase" | "none";
  letterSpacing: string;
} {
  return {
    textTransform: style.labelCase === "upper" ? "uppercase" : "none",
    letterSpacing: `${style.labelTrack}em`,
  };
}

export const CHART_STYLE_SHEET: Record<string, ChartStyle> = {
  ...SKIN_CHART_STYLES,
  ...INDUSTRY_CHART_STYLES,
};
