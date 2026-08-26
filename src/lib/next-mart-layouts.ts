// Reusable NEXT MART layout presets.
//
// The mart runs the same four pillar templates as the rest of NEXT, but the shop
// floor has its own reading distances: entrance towers are read down a
// concourse, till pillars at arm's length, wayfinding on the move. Each preset
// below fixes the whole layout — QR block placement and caption formatting plus
// the wayfinding geometry (headline size, vertical run, downward offset, lockup
// scale, arrow silhouette) — as fractions of the trim sheet, so it re-lays on
// any pillar footprint instead of being re-dragged per size.
//
// Placements are authored as fractions (0–1) of the trim width/height, so a
// preset tuned on the standard pillar lands in the same visual spot on a thin
// column or a wrap face.

import {
  PILLAR_SIZES,
  pillarKind,
  type PillarArrowStyleId,
  type PillarCaptionAlign,
  type PillarCaptionFontId,
  type PillarConfig,
  type PillarKindId,
  type PillarSizeId,
} from "@/lib/next-pillar-masters";

export type MartLayoutPreset = {
  id: string;
  name: string;
  note: string;
  /** Templates this layout is designed for. */
  kinds: PillarKindId[];
  /** Footprints it is tuned for. Empty = every footprint (rescaled). */
  sizes: PillarSizeId[];
  /** QR block placement as a fraction of the trim sheet. null = default flow. */
  qrFracX: number | null;
  qrFracY: number | null;
  /** QR block edge as a fraction of trim width. */
  qrFracSize: number;
  qrCaptionFont: PillarCaptionFontId;
  qrCaptionAlign: PillarCaptionAlign;
  /** Caption cap height in mm. 0 = follow the sub-line size. */
  qrCaptionSize: number;
  /** Caption / safe-edge padding in mm. */
  qrCaptionPad: number;
  qrTransparent: boolean;
  /** Wayfinding geometry. */
  verticalHeadline: boolean;
  /** Headline cap height as a fraction of trim height. */
  headlineFracSize: number;
  /** Downward headline offset as a fraction of trim height. */
  headlineFracOffset: number;
  /** Lockup width scale, 1 = approved default. */
  lockupScale: number;
  arrowStyle?: PillarArrowStyleId;
};

/**
 * The issued mart layout library. Every entry is production-approved: QR blocks
 * stay inside the safe area at every footprint, and headline sizes stay within
 * the pillar's legibility band for the distance the sign is read from.
 */
export const MART_LAYOUT_PRESETS: MartLayoutPreset[] = [
  {
    id: "mart-entrance-tower",
    name: "Entrance tower",
    note: "Threshold pillar read down the concourse: headline runs the full column, shop QR sits low-right on the plate.",
    kinds: ["welcome"],
    sizes: [],
    qrFracX: 0.6,
    qrFracY: 0.78,
    qrFracSize: 0.33,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 0,
    qrCaptionPad: 18,
    qrTransparent: false,
    verticalHeadline: true,
    headlineFracSize: 0.052,
    headlineFracOffset: 0.02,
    lockupScale: 0.62,
  },
  {
    id: "mart-entrance-banner",
    name: "Entrance — horizontal band",
    note: "Wide or wrap faces: headline lies across the sheet with the QR centred beneath it.",
    kinds: ["welcome"],
    sizes: ["wide", "wrap"],
    qrFracX: 0.36,
    qrFracY: 0.7,
    qrFracSize: 0.28,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 22,
    qrCaptionPad: 22,
    qrTransparent: false,
    verticalHeadline: false,
    headlineFracSize: 0.046,
    headlineFracOffset: 0.06,
    lockupScale: 0.7,
  },
  {
    id: "mart-till-hand-height",
    name: "Till · hand height",
    note: "Checkout pillar: QR drops to hand height so a queue can scan it, caption left-aligned for a close read.",
    kinds: ["registration"],
    sizes: [],
    qrFracX: 0.14,
    qrFracY: 0.6,
    qrFracSize: 0.42,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "left",
    qrCaptionSize: 24,
    qrCaptionPad: 16,
    qrTransparent: false,
    verticalHeadline: false,
    headlineFracSize: 0.038,
    headlineFracOffset: 0.03,
    lockupScale: 0.58,
  },
  {
    id: "mart-till-tap-scan",
    name: "Till · tap-and-scan",
    note: "Small-footprint till marker: oversized code with no plate so it prints straight onto the gradient.",
    kinds: ["registration"],
    sizes: ["thin", "slim"],
    qrFracX: 0.16,
    qrFracY: 0.52,
    qrFracSize: 0.6,
    qrCaptionFont: "regular",
    qrCaptionAlign: "center",
    qrCaptionSize: 18,
    qrCaptionPad: 14,
    qrTransparent: true,
    verticalHeadline: true,
    headlineFracSize: 0.034,
    headlineFracOffset: 0,
    lockupScale: 0.54,
  },
  {
    id: "mart-wayfinding-chevron",
    name: "Wayfinding · chevron",
    note: "Moving traffic: chevron arrow with a short vertical headline and no code, so nothing competes with the direction.",
    kinds: ["directional"],
    sizes: [],
    qrFracX: null,
    qrFracY: null,
    qrFracSize: 0.28,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 0,
    qrCaptionPad: 18,
    qrTransparent: false,
    verticalHeadline: true,
    headlineFracSize: 0.044,
    headlineFracOffset: 0.05,
    lockupScale: 0.5,
    arrowStyle: "chevron",
  },
  {
    id: "mart-wayfinding-queue",
    name: "Wayfinding · queue entry",
    note: "Queue head: solid arrow high, headline mid-sheet, scan-ahead code parked bottom-centre.",
    kinds: ["directional"],
    sizes: [],
    qrFracX: 0.34,
    qrFracY: 0.82,
    qrFracSize: 0.3,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 20,
    qrCaptionPad: 18,
    qrTransparent: false,
    verticalHeadline: false,
    headlineFracSize: 0.04,
    headlineFracOffset: 0.12,
    lockupScale: 0.52,
    arrowStyle: "solid",
  },
  {
    id: "mart-wayfinding-corridor",
    name: "Wayfinding · corridor repeat",
    note: "Repeated down a corridor: outline arrow, compact headline, lockup held small so the run reads as a rhythm.",
    kinds: ["directional"],
    sizes: [],
    qrFracX: null,
    qrFracY: null,
    qrFracSize: 0.26,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 0,
    qrCaptionPad: 16,
    qrTransparent: false,
    verticalHeadline: true,
    headlineFracSize: 0.036,
    headlineFracOffset: 0.08,
    lockupScale: 0.46,
    arrowStyle: "slim",
  },
  {
    id: "mart-logo-shop-scan",
    name: "Logo · shop the range",
    note: "Brand-only pillar carrying the shop code: lockup low per the general-logo rule, code centred underneath.",
    kinds: ["logo"],
    sizes: [],
    qrFracX: 0.32,
    qrFracY: 0.66,
    qrFracSize: 0.36,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 22,
    qrCaptionPad: 20,
    qrTransparent: false,
    verticalHeadline: false,
    headlineFracSize: 0.04,
    headlineFracOffset: 0,
    lockupScale: 0.72,
  },
  {
    id: "mart-logo-clean",
    name: "Logo · clean face",
    note: "No code, no copy — the reversed mark on the gradient for repeats either side of the mart.",
    kinds: ["logo"],
    sizes: [],
    qrFracX: null,
    qrFracY: null,
    qrFracSize: 0.28,
    qrCaptionFont: "bold-caps",
    qrCaptionAlign: "center",
    qrCaptionSize: 0,
    qrCaptionPad: 18,
    qrTransparent: false,
    verticalHeadline: false,
    headlineFracSize: 0.04,
    headlineFracOffset: 0,
    lockupScale: 0.86,
  },
];

/** Live trim footprint of a config, in mm. */
function trimOf(config: PillarConfig): { w: number; h: number } {
  const size = PILLAR_SIZES.find((s) => s.id === config.sizeId);
  const w = size && size.id !== "custom" ? size.trimW : Number(config.trimW);
  const h = size && size.id !== "custom" ? size.trimH : Number(config.trimH);
  return { w: Number.isFinite(w) && w > 0 ? w : 1, h: Number.isFinite(h) && h > 0 ? h : 1 };
}

/**
 * Layouts available for a config, exact footprint matches first. A preset with
 * no declared sizes fits any footprint because its geometry is fractional.
 */
export function martLayoutsFor(config: PillarConfig): {
  exact: MartLayoutPreset[];
  other: MartLayoutPreset[];
} {
  const kind = pillarKind(config.kind).id as PillarKindId;
  const rows = MART_LAYOUT_PRESETS.filter((p) => p.kinds.includes(kind));
  return {
    exact: rows.filter((p) => p.sizes.length === 0 || p.sizes.includes(config.sizeId)),
    other: rows.filter((p) => p.sizes.length > 0 && !p.sizes.includes(config.sizeId)),
  };
}

export function martLayoutById(id: string): MartLayoutPreset | undefined {
  return MART_LAYOUT_PRESETS.find((p) => p.id === id);
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

/**
 * Resolve a fractional layout onto the live footprint. Sizes are clamped to the
 * ranges the editor and exporter accept, so an applied preset is always
 * printable without a manual correction pass.
 */
export function applyMartLayout(config: PillarConfig, preset: MartLayoutPreset): PillarConfig {
  const trim = trimOf(config);
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  const qrSize = clamp(round(preset.qrFracSize * trim.w, 10), 60, 500);
  const headlineSize = clamp(round(preset.headlineFracSize * trim.h, 2), 40, 220);
  const headlineOffset = clamp(round(preset.headlineFracOffset * trim.h, 10), 0, 900);

  // Placement is stored top-left of the QR block, so the code plus its caption
  // has to clear the bottom safe edge on the live sheet.
  const maxX = Math.max(0, trim.w - qrSize);
  const maxY = Math.max(0, trim.h - qrSize - preset.qrCaptionPad * 2);

  return {
    ...config,
    qrSize,
    qrCaptionFont: preset.qrCaptionFont,
    qrCaptionSize: preset.qrCaptionSize,
    qrCaptionAlign: preset.qrCaptionAlign,
    qrCaptionPad: preset.qrCaptionPad,
    qrTransparent: preset.qrTransparent,
    qrOffsetX: preset.qrFracX === null ? null : clamp(round(preset.qrFracX * trim.w), 0, maxX),
    qrOffsetY: preset.qrFracY === null ? null : clamp(round(preset.qrFracY * trim.h), 0, maxY),
    verticalHeadline: preset.verticalHeadline,
    headlineSize,
    headlineOffset,
    lockupScale: clamp(preset.lockupScale, 0.5, 1.6),
    arrowStyle: preset.arrowStyle ?? config.arrowStyle,
  };
}

/** One-line summary for the picker rows. */
export function martLayoutSummary(preset: MartLayoutPreset, config: PillarConfig): string {
  const applied = applyMartLayout(config, preset);
  const qr =
    applied.qrOffsetX === null
      ? "QR in default flow"
      : `QR ${applied.qrSize} mm · x ${applied.qrOffsetX} · y ${applied.qrOffsetY} mm`;
  const head = `headline ${applied.headlineSize} mm${applied.verticalHeadline ? " vertical" : ""}`;
  return `${qr} · ${head}`;
}
