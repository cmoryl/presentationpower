// -----------------------------------------------------------------------------
// PACK COMPOSITION — how a skin arranges the module on the sheet
//
// Geometry (pack-geometry.ts) decides what the *cards* look like. This layer
// decides how the *module itself* sits on the page: which edge it hugs, where
// its mass falls, how wide the reading column runs, whether it rides a plate,
// and how its stack is ordered. Two skins with identical modules therefore read
// as two different layouts, not the same layout in another colour.
//
// Uniqueness is free: every skin already owns a unique (scaffold, margin device)
// pair, and the profile is derived from that pair — so no two skins compose the
// same way. `fill` then tunes how much of the open space the module occupies.
// -----------------------------------------------------------------------------

import { packGeometry, type MarginDevice, type ScaffoldFamily } from "./pack-geometry";
import type { StylePack } from "./style-packs";

export type ComposeAnchor = "top" | "center" | "bottom" | "baseline";
export type ComposeBias = "left" | "right" | "center" | "wide";
export type ComposePlate =
  | "none"
  | "panel"
  | "band"
  | "edge"
  | "frame"
  | "shadowbox"
  | "tray"
  | "sill"
  | "cartouche"
  | "tabbed"
  | "ruleTop"
  | "ruleSide"
  | "pillow"
  | "cutcorner";
export type ComposeOrder = "natural" | "reverse" | "mediaFirst" | "mediaLast";

export interface PackCompose {
  anchor: ComposeAnchor;
  bias: ComposeBias;
  /** Reading column width as a fraction of the 1920px stage. */
  column: number;
  plate: ComposePlate;
  order: ComposeOrder;
  /** Extra inset (stage px) applied to the leading edge — asymmetric margins. */
  lead: number;
  /** Extra inset (stage px) applied to the trailing edge. */
  trail: number;
  /** Vertical rhythm multiplier for gaps between module rows. */
  rhythm: number;
}

const SCAFFOLD_COMPOSE: Record<
  ScaffoldFamily,
  { anchor: ComposeAnchor; bias: ComposeBias; column: number; order: ComposeOrder }
> = {
  margin: { anchor: "top", bias: "left", column: 0.72, order: "natural" },
  column: { anchor: "center", bias: "right", column: 0.62, order: "mediaFirst" },
  plinth: { anchor: "bottom", bias: "left", column: 0.78, order: "mediaLast" },
  banner: { anchor: "top", bias: "wide", column: 0.92, order: "natural" },
  quadrant: { anchor: "center", bias: "center", column: 0.84, order: "reverse" },
  ledger: { anchor: "baseline", bias: "left", column: 0.66, order: "natural" },
  split: { anchor: "center", bias: "left", column: 0.52, order: "mediaLast" },
  stack: { anchor: "bottom", bias: "center", column: 0.7, order: "reverse" },
  wedge: { anchor: "baseline", bias: "right", column: 0.58, order: "mediaFirst" },
  frame: { anchor: "center", bias: "wide", column: 0.8, order: "natural" },
  gutter: { anchor: "top", bias: "right", column: 0.68, order: "mediaLast" },
  shelf: { anchor: "bottom", bias: "wide", column: 0.88, order: "natural" },
  corner: { anchor: "baseline", bias: "center", column: 0.74, order: "mediaFirst" },
  canyon: { anchor: "center", bias: "wide", column: 0.6, order: "reverse" },
};

/**
 * One plate treatment per margin device. Because no two skins share a
 * (scaffold, device) pair, and the scaffold fixes anchor/bias/column/order,
 * a distinct plate per device guarantees a distinct composition per skin.
 */
const DEVICE_PLATE: Record<MarginDevice, ComposePlate> = {
  bracket: "frame",
  staff: "ruleSide",
  notches: "edge",
  register: "panel",
  tilt: "shadowbox",
  steps: "band",
  crosshair: "none",
  arc: "pillow",
  barcode: "sill",
  grid: "tray",
  chevron: "cutcorner",
  dial: "cartouche",
  seal: "tabbed",
  index: "ruleTop",
};

/** Deterministic composition profile for a pack. */
export function packCompose(pack: StylePack): PackCompose {
  const g = packGeometry(pack);
  const base = SCAFFOLD_COMPOSE[g.scaffold] ?? SCAFFOLD_COMPOSE.margin;
  const plate = DEVICE_PLATE[g.device] ?? "none";

  // Dense skins pull their margins in and widen the column; airy skins push
  // the module off one edge so the sheet keeps its silence.
  const dense = Math.min(1, Math.max(0, g.fill));
  const column = Math.min(0.96, base.column + dense * 0.14);
  const swing = Math.round(28 + (1 - dense) * 92);

  const lead = base.bias === "right" ? swing : base.bias === "left" ? 0 : Math.round(swing / 2);
  const trail = base.bias === "left" ? swing : base.bias === "right" ? 0 : Math.round(swing / 2);

  return {
    anchor: base.anchor,
    bias: base.bias,
    column,
    plate,
    order: base.order,
    lead,
    trail,
    rhythm: Number((0.86 + dense * 0.34).toFixed(3)),
  };
}

/** CSS custom properties + layout style for the module content plane. */
export function composeVars(c: PackCompose): Record<string, string> {
  return {
    "--pack-compose-anchor": c.anchor,
    "--pack-compose-bias": c.bias,
    "--pack-compose-column": String(c.column),
    "--pack-compose-plate": c.plate,
    "--pack-compose-order": c.order,
    "--pack-compose-rhythm": String(c.rhythm),
    "--pack-compose-lead": `${c.lead}px`,
    "--pack-compose-trail": `${c.trail}px`,
  };
}

export const COMPOSE_LABEL: Record<ComposePlate, string> = {
  none: "Bare sheet",
  panel: "Inset panel",
  band: "Full-width band",
  edge: "Edge plate",
  frame: "Ruled frame",
  shadowbox: "Lifted shadowbox",
  tray: "Recessed tray",
  sill: "Base sill",
  cartouche: "Rounded cartouche",
  tabbed: "Tabbed plate",
  ruleTop: "Top rule only",
  ruleSide: "Side rule only",
  pillow: "Soft pillow",
  cutcorner: "Cut-corner plate",
};

/** One-line description of how a skin composes its modules. */
export function composeSummary(c: PackCompose): string {
  const anchor = { top: "top-anchored", center: "centred", bottom: "bottom-anchored", baseline: "baseline-set" }[
    c.anchor
  ];
  const bias = { left: "left mass", right: "right mass", center: "symmetric", wide: "full-bleed" }[c.bias];
  return `${anchor} · ${bias} · ${Math.round(c.column * 100)}% column · ${COMPOSE_LABEL[c.plate].toLowerCase()}`;
}

/**
 * The visual plate a composition rides on, as plain CSS.
 *
 * This is the single biggest source of layout difference between skins: the
 * same module reads as a recessed tray in one look, a bare sheet with a top
 * rule in another, and a lifted shadowbox in a third.
 */
export function composePlateCss(
  plate: ComposePlate,
  pack: StylePack,
): { style: Record<string, string>; pad: { x: number; y: number } } {
  const t = pack.tokens;
  const dark = pack.mode === "dark";
  const veil = dark ? "rgba(255,255,255,0.055)" : "rgba(12,18,32,0.038)";
  const veilStrong = dark ? "rgba(255,255,255,0.085)" : "rgba(12,18,32,0.06)";
  const line = t.hairline;

  switch (plate) {
    case "panel":
      return {
        style: { backgroundColor: veil, border: `1px solid ${line}`, borderRadius: "18px" },
        pad: { x: 44, y: 36 },
      };
    case "band":
      return {
        style: {
          backgroundColor: veil,
          borderTop: `1px solid ${line}`,
          borderBottom: `1px solid ${line}`,
        },
        pad: { x: 0, y: 40 },
      };
    case "edge":
      return { style: { borderLeft: `4px solid ${t.accent}` }, pad: { x: 36, y: 8 } };
    case "frame":
      return {
        style: { border: `1px solid ${line}`, outline: `1px solid ${veil}`, outlineOffset: "10px" },
        pad: { x: 40, y: 34 },
      };
    case "shadowbox":
      return {
        style: {
          backgroundColor: veilStrong,
          borderRadius: "10px",
          boxShadow: dark
            ? "0 40px 80px -48px rgba(0,0,0,0.8)"
            : "0 40px 80px -48px rgba(16,24,40,0.35)",
        },
        pad: { x: 46, y: 38 },
      };
    case "tray":
      return {
        style: {
          backgroundColor: veil,
          borderRadius: "4px",
          boxShadow: `inset 0 1px 0 ${line}, inset 0 -1px 0 ${line}`,
        },
        pad: { x: 42, y: 34 },
      };
    case "sill":
      return { style: { borderBottom: `6px solid ${t.accent}` }, pad: { x: 0, y: 22 } };
    case "cartouche":
      return {
        style: { backgroundColor: veil, borderRadius: "999px 999px 28px 28px" },
        pad: { x: 56, y: 40 },
      };
    case "tabbed":
      return {
        style: {
          backgroundColor: veil,
          borderRadius: "22px 6px 22px 6px",
          border: `1px solid ${line}`,
        },
        pad: { x: 44, y: 36 },
      };
    case "ruleTop":
      return { style: { borderTop: `2px solid ${t.accent}` }, pad: { x: 0, y: 26 } };
    case "ruleSide":
      return { style: { borderRight: `1px solid ${line}` }, pad: { x: 26, y: 6 } };
    case "pillow":
      return {
        style: { backgroundColor: veil, borderRadius: "56px" },
        pad: { x: 52, y: 42 },
      };
    case "cutcorner":
      return {
        style: {
          backgroundColor: veil,
          clipPath: "polygon(0 0, calc(100% - 42px) 0, 100% 42px, 100% 100%, 42px 100%, 0 calc(100% - 42px))",
        },
        pad: { x: 46, y: 38 },
      };
    case "none":
    default:
      return { style: {}, pad: { x: 0, y: 0 } };
  }
}
