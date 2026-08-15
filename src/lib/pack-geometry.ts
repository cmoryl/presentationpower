/**
 * PACK GEOMETRY — per-style box shapes, section layouts and page signatures.
 *
 * Design review finding: alternate looks were reading as the same deck in a new
 * palette, because ten card shapes and one shared page scaffold were spread
 * across twenty-eight visual languages. This module now gives every catalog
 * language its OWN, non-repeating trio:
 *
 *   • CARD SHAPE      — 28 distinct box languages, one per skin, never reused.
 *   • SECTION LAYOUT  — how the cover, stat wall, grid and rules compose.
 *   • PAGE SIGNATURE  — a scaffold family (how the sheet's open space is
 *                       structured and filled) plus a margin device.
 *
 * Everything is resolved deterministically: catalog skins get a hand-assigned
 * sheet (below), and anything else falls back to a stable hash of its id, so a
 * given style always renders the same geometry everywhere — previews, lookbook,
 * live slides and export.
 */

import type { StylePack } from "./style-packs";

export type CardShape =
  | "round" // uniform soft corners
  | "capsule" // pill ends
  | "leaf" // diagonal corner pair (soft/hard alternating)
  | "tab" // rounded top, square base — folder tab
  | "bracket" // left accent bar
  | "underline" // bottom accent rule
  | "notch" // cut top-right corner
  | "ticket" // cut both bottom corners
  | "offset" // hard offset drop (slab / risograph)
  | "double" // double ring outline
  | "chamfer" // all four corners cut — octagon
  | "arch" // large top radius, square base
  | "fold" // bottom-right dog-ear fold
  | "blade" // steep top-left diagonal cut
  | "wedge" // slanted right edge
  | "stair" // stepped bottom-left
  | "gem" // asymmetric octagon (TL + BR cut)
  | "scoop" // deep bottom-left scoop
  | "spine" // heavy left slab shadow
  | "plinth" // heavy bottom slab shadow
  | "rail" // inset hairlines top and bottom
  | "shutter" // inset accent bar across the top
  | "keyhole" // top-centre notch cut
  | "lozenge" // hexagon — mid-edge points
  | "halo" // outer soft ring glow
  | "crest" // rounded shoulders, cut base centre
  | "slat" // heavy right-edge accent slat
  | "diptych"; // hairline box with split accent edges

export type CoverLayout = "baseline" | "centered" | "split" | "banded" | "stacked";
export type StatLayout = "cards4" | "cards3" | "rail" | "band";
export type GridLayout = "bento" | "mosaic" | "columns" | "stack";
export type RuleLayout = "bar" | "dots" | "hairline" | "none";

/**
 * SCAFFOLD FAMILY — how a sheet's open space is structured. This is the part
 * that makes two packs feel like different design studios rather than two
 * palettes: where the mass sits, what fills the empty half of the page, and
 * how the reading column is framed.
 */
export type ScaffoldFamily =
  | "margin" // narrow rules, wide air — Swiss margin discipline
  | "column" // full-height side column of flat ink
  | "plinth" // heavy footer slab carrying the page
  | "banner" // header band across the top
  | "quadrant" // one filled quarter panel
  | "ledger" // ruled ledger frame + baseline
  | "split" // vertical half-and-half field
  | "stack" // stacked horizontal bands
  | "wedge" // diagonal field cutting the sheet
  | "frame" // inset mat frame, gallery register
  | "gutter" // structural column gutters
  | "shelf" // low shelf band under the headline
  | "corner" // two opposing corner blocks
  | "canyon"; // twin outer masses, open centre

/** Margin device — the pack's small drawn signature in the outer margin. */
export type MarginDevice =
  | "bracket"
  | "staff"
  | "notches"
  | "register"
  | "tilt"
  | "steps"
  | "crosshair"
  | "arc"
  | "barcode"
  | "grid"
  | "chevron"
  | "dial"
  | "seal"
  | "index";

export interface PackLayout {
  cover: CoverLayout;
  stats: StatLayout;
  grid: GridLayout;
  rule: RuleLayout;
}

export interface PackGeometry {
  shape: CardShape;
  layout: PackLayout;
  scaffold: ScaffoldFamily;
  device: MarginDevice;
  /** 0 = airy, 1 = dense. Drives how far the scaffold fills open space. */
  fill: number;
}

const SHAPES: CardShape[] = [
  "round",
  "capsule",
  "leaf",
  "tab",
  "bracket",
  "underline",
  "notch",
  "ticket",
  "offset",
  "double",
  "chamfer",
  "arch",
  "fold",
  "blade",
  "wedge",
  "stair",
  "gem",
  "scoop",
  "spine",
  "plinth",
  "rail",
  "shutter",
  "keyhole",
  "lozenge",
  "halo",
  "crest",
  "slat",
  "diptych",
];
const COVERS: CoverLayout[] = ["baseline", "centered", "split", "banded", "stacked"];
const STATS: StatLayout[] = ["cards4", "cards3", "rail", "band"];
const GRIDS: GridLayout[] = ["bento", "mosaic", "columns", "stack"];
const RULES: RuleLayout[] = ["bar", "dots", "hairline", "none"];
const SCAFFOLDS: ScaffoldFamily[] = [
  "margin",
  "column",
  "plinth",
  "banner",
  "quadrant",
  "ledger",
  "split",
  "stack",
  "wedge",
  "frame",
  "gutter",
  "shelf",
  "corner",
  "canyon",
];
const DEVICES: MarginDevice[] = [
  "bracket",
  "staff",
  "notches",
  "register",
  "tilt",
  "steps",
  "crosshair",
  "arc",
  "barcode",
  "grid",
  "chevron",
  "dial",
  "seal",
  "index",
];

/**
 * HAND-ASSIGNED SHEET for the catalog languages S01–S28.
 *
 * Invariants, enforced by src/lib/__tests__/pack-geometry-unique.test.ts:
 *   • every skin owns a card shape no other skin uses;
 *   • no two skins share the same (scaffold, device) pair;
 *   • no two skins share the same full section-layout combination.
 */
export const SKIN_GEOMETRY: Record<string, PackGeometry> = {
  S01: { shape: "round", scaffold: "margin", device: "bracket", fill: 0.3, layout: { cover: "baseline", stats: "cards4", grid: "bento", rule: "bar" } },
  S02: { shape: "capsule", scaffold: "shelf", device: "arc", fill: 0.45, layout: { cover: "centered", stats: "cards3", grid: "mosaic", rule: "dots" } },
  S03: { shape: "leaf", scaffold: "split", device: "staff", fill: 0.6, layout: { cover: "split", stats: "cards4", grid: "columns", rule: "bar" } },
  S04: { shape: "notch", scaffold: "quadrant", device: "notches", fill: 0.7, layout: { cover: "stacked", stats: "rail", grid: "mosaic", rule: "hairline" } },
  S05: { shape: "underline", scaffold: "ledger", device: "index", fill: 0.5, layout: { cover: "baseline", stats: "band", grid: "columns", rule: "hairline" } },
  S06: { shape: "bracket", scaffold: "column", device: "register", fill: 0.65, layout: { cover: "split", stats: "cards3", grid: "bento", rule: "bar" } },
  S07: { shape: "chamfer", scaffold: "frame", device: "crosshair", fill: 0.4, layout: { cover: "centered", stats: "cards4", grid: "mosaic", rule: "dots" } },
  S08: { shape: "arch", scaffold: "banner", device: "seal", fill: 0.55, layout: { cover: "banded", stats: "cards3", grid: "stack", rule: "bar" } },
  S09: { shape: "double", scaffold: "gutter", device: "grid", fill: 0.6, layout: { cover: "stacked", stats: "rail", grid: "columns", rule: "dots" } },
  S10: { shape: "halo", scaffold: "canyon", device: "dial", fill: 0.35, layout: { cover: "split", stats: "band", grid: "bento", rule: "hairline" } },
  S11: { shape: "rail", scaffold: "stack", device: "barcode", fill: 0.75, layout: { cover: "baseline", stats: "cards4", grid: "columns", rule: "bar" } },
  S12: { shape: "tab", scaffold: "corner", device: "steps", fill: 0.5, layout: { cover: "stacked", stats: "band", grid: "mosaic", rule: "hairline" } },
  S13: { shape: "crest", scaffold: "shelf", device: "seal", fill: 0.45, layout: { cover: "banded", stats: "cards4", grid: "stack", rule: "dots" } },
  S14: { shape: "offset", scaffold: "wedge", device: "chevron", fill: 0.8, layout: { cover: "split", stats: "band", grid: "columns", rule: "none" } },
  S15: { shape: "ticket", scaffold: "plinth", device: "notches", fill: 0.6, layout: { cover: "centered", stats: "rail", grid: "stack", rule: "hairline" } },
  S16: { shape: "lozenge", scaffold: "canyon", device: "tilt", fill: 0.4, layout: { cover: "centered", stats: "rail", grid: "mosaic", rule: "none" } },
  S17: { shape: "scoop", scaffold: "quadrant", device: "arc", fill: 0.55, layout: { cover: "banded", stats: "cards3", grid: "bento", rule: "dots" } },
  S18: { shape: "gem", scaffold: "frame", device: "register", fill: 0.45, layout: { cover: "baseline", stats: "cards3", grid: "mosaic", rule: "bar" } },
  S19: { shape: "spine", scaffold: "column", device: "index", fill: 0.7, layout: { cover: "stacked", stats: "band", grid: "columns", rule: "hairline" } },
  S20: { shape: "keyhole", scaffold: "banner", device: "dial", fill: 0.5, layout: { cover: "split", stats: "rail", grid: "bento", rule: "dots" } },
  S21: { shape: "shutter", scaffold: "stack", device: "steps", fill: 0.65, layout: { cover: "centered", stats: "cards4", grid: "stack", rule: "bar" } },
  S22: { shape: "slat", scaffold: "gutter", device: "staff", fill: 0.55, layout: { cover: "banded", stats: "rail", grid: "stack", rule: "hairline" } },
  S23: { shape: "blade", scaffold: "wedge", device: "tilt", fill: 0.8, layout: { cover: "stacked", stats: "cards3", grid: "columns", rule: "none" } },
  S24: { shape: "fold", scaffold: "ledger", device: "crosshair", fill: 0.5, layout: { cover: "centered", stats: "band", grid: "bento", rule: "bar" } },
  S25: { shape: "stair", scaffold: "corner", device: "barcode", fill: 0.7, layout: { cover: "baseline", stats: "cards4", grid: "mosaic", rule: "none" } },
  S26: { shape: "plinth", scaffold: "plinth", device: "bracket", fill: 0.75, layout: { cover: "stacked", stats: "cards3", grid: "bento", rule: "dots" } },
  S27: { shape: "wedge", scaffold: "split", device: "chevron", fill: 0.6, layout: { cover: "split", stats: "rail", grid: "mosaic", rule: "bar" } },
  S28: { shape: "diptych", scaffold: "margin", device: "grid", fill: 0.35, layout: { cover: "banded", stats: "cards4", grid: "columns", rule: "dots" } },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Resolve geometry for any pack: declared sheet first, stable hash otherwise. */
export function packGeometry(pack: StylePack): PackGeometry {
  const declared = pack.geometry;
  if (declared) return declared;
  const h = hash(pack.id);
  const hard = pack.card.radius <= 4;
  const shapePool = hard
    ? (["offset", "notch", "underline", "bracket", "double", "ticket", "blade", "wedge", "stair", "spine", "plinth", "slat", "chamfer", "diptych"] as CardShape[])
    : (["round", "capsule", "leaf", "tab", "bracket", "underline", "arch", "fold", "scoop", "halo", "crest", "keyhole", "lozenge", "rail", "shutter", "gem"] as CardShape[]);
  return {
    shape: pack.card.shape ?? shapePool[h % shapePool.length]!,
    scaffold: SCAFFOLDS[(h >> 3) % SCAFFOLDS.length]!,
    device: DEVICES[(h >> 5) % DEVICES.length]!,
    fill: 0.3 + ((h >> 7) % 6) * 0.1,
    layout:
      pack.layout ??
      ({
        cover: COVERS[h % COVERS.length]!,
        stats: STATS[(h >> 2) % STATS.length]!,
        grid: GRIDS[(h >> 4) % GRIDS.length]!,
        rule: RULES[(h >> 6) % RULES.length]!,
      } satisfies PackLayout),
  };
}

/** Shape catalogue for docs / spec strips. */
export const SHAPE_LABEL: Record<CardShape, string> = {
  round: "soft corners",
  capsule: "pill ends",
  leaf: "diagonal corners",
  tab: "folder tab",
  bracket: "accent bracket",
  underline: "underscored",
  notch: "cut corner",
  ticket: "ticket cut",
  offset: "offset slab",
  double: "double ring",
  chamfer: "chamfered octagon",
  arch: "arched head",
  fold: "dog-ear fold",
  blade: "blade cut",
  wedge: "slanted edge",
  stair: "stepped base",
  gem: "gem facet",
  scoop: "scooped base",
  spine: "left spine",
  plinth: "plinth base",
  rail: "railed edges",
  shutter: "shutter head",
  keyhole: "keyhole notch",
  lozenge: "lozenge hex",
  halo: "halo ring",
  crest: "crest shoulders",
  slat: "right slat",
  diptych: "split diptych",
};

export const SCAFFOLD_LABEL: Record<ScaffoldFamily, string> = {
  margin: "wide margin",
  column: "side column",
  plinth: "footer plinth",
  banner: "header banner",
  quadrant: "quarter panel",
  ledger: "ruled ledger",
  split: "half field",
  stack: "banded stack",
  wedge: "diagonal wedge",
  frame: "gallery mat",
  gutter: "column gutters",
  shelf: "headline shelf",
  corner: "corner blocks",
  canyon: "open canyon",
};

export const SHAPE_POOL = SHAPES;

/**
 * Turn a shape into concrete CSS. `radius` is the pack's base corner radius and
 * `accent` its signature colour; `ink` drives hard-edged slab treatments.
 */
export function shapeCss(
  shape: CardShape,
  opts: { radius: number; accent: string; ink: string; baseShadow: string; dark: boolean },
): { radius: string; extraShadow: string; clipPath?: string } {
  const { radius, accent, ink, baseShadow, dark } = opts;
  const r = Math.max(radius, 0);
  const join = (...parts: string[]) => parts.filter((p) => p && p !== "none").join(", ");
  const veil = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  switch (shape) {
    case "capsule":
      return { radius: `${Math.max(r, 22)}px`, extraShadow: baseShadow };
    case "leaf":
      return { radius: `${Math.max(r, 14)}px 3px ${Math.max(r, 14)}px 3px`, extraShadow: baseShadow };
    case "tab":
      return { radius: `${Math.max(r, 12)}px ${Math.max(r, 12)}px 2px 2px`, extraShadow: baseShadow };
    case "bracket":
      return {
        radius: `2px ${r}px ${r}px 2px`,
        extraShadow: join(`inset 3px 0 0 0 ${accent}`, baseShadow),
      };
    case "underline":
      return {
        radius: `${r}px ${r}px 2px 2px`,
        extraShadow: join(`inset 0 -3px 0 0 ${accent}`, baseShadow),
      };
    case "notch":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)",
      };
    case "ticket":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath:
          "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))",
      };
    case "offset":
      return {
        radius: `${Math.min(r, 4)}px`,
        extraShadow: `5px 5px 0 0 ${dark ? accent : ink}`,
      };
    case "double":
      return {
        radius: `${r}px`,
        extraShadow: join(`0 0 0 1px ${accent}`, `0 0 0 5px ${veil}`, baseShadow),
      };
    case "chamfer":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath:
          "polygon(11px 0, calc(100% - 11px) 0, 100% 11px, 100% calc(100% - 11px), calc(100% - 11px) 100%, 11px 100%, 0 calc(100% - 11px), 0 11px)",
      };
    case "arch":
      return { radius: `${Math.max(r, 30)}px ${Math.max(r, 30)}px 3px 3px`, extraShadow: baseShadow };
    case "fold":
      return {
        radius: `${Math.min(r, 8)}px`,
        extraShadow: baseShadow,
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
      };
    case "blade":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath: "polygon(28px 0, 100% 0, 100% 100%, 0 100%, 0 26px)",
      };
    case "wedge":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath: "polygon(0 0, 100% 14px, 100% 100%, 0 calc(100% - 6px))",
      };
    case "stair":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath:
          "polygon(0 0, 100% 0, 100% 100%, 30px 100%, 30px calc(100% - 12px), 0 calc(100% - 12px))",
      };
    case "gem":
      return {
        radius: "0px",
        extraShadow: join(`inset 0 0 0 1px ${accent}`, baseShadow),
        clipPath:
          "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
      };
    case "scoop":
      return { radius: `${Math.min(r, 6)}px ${Math.min(r, 6)}px ${Math.min(r, 6)}px ${Math.max(r, 34)}px`, extraShadow: baseShadow };
    case "spine":
      return {
        radius: `0px ${Math.min(r, 10)}px ${Math.min(r, 10)}px 0px`,
        extraShadow: join(`inset 8px 0 0 0 ${accent}`, `inset 10px 0 0 0 ${veil}`, baseShadow),
      };
    case "plinth":
      return {
        radius: `${Math.min(r, 10)}px ${Math.min(r, 10)}px 0 0`,
        extraShadow: join(`inset 0 -9px 0 0 ${accent}`, baseShadow),
      };
    case "rail":
      return {
        radius: "0px",
        extraShadow: join(`inset 0 2px 0 0 ${accent}`, `inset 0 -2px 0 0 ${accent}`, baseShadow),
      };
    case "shutter":
      return {
        radius: `${Math.min(r, 8)}px`,
        extraShadow: join(`inset 0 8px 0 0 ${accent}`, `inset 0 10px 0 0 ${veil}`, baseShadow),
      };
    case "keyhole":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath:
          "polygon(0 0, calc(50% - 22px) 0, calc(50% - 14px) 12px, calc(50% + 14px) 12px, calc(50% + 22px) 0, 100% 0, 100% 100%, 0 100%)",
      };
    case "lozenge":
      return {
        radius: "0px",
        extraShadow: baseShadow,
        clipPath: "polygon(18px 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0 50%)",
      };
    case "halo":
      return {
        radius: `${Math.max(r, 18)}px`,
        extraShadow: join(`0 0 0 6px ${veil}`, `0 0 24px -6px ${accent}`, baseShadow),
      };
    case "crest":
      return {
        radius: `${Math.max(r, 26)}px ${Math.max(r, 26)}px 4px 4px`,
        extraShadow: baseShadow,
        clipPath:
          "polygon(0 0, 100% 0, 100% 100%, calc(50% + 18px) 100%, 50% calc(100% - 11px), calc(50% - 18px) 100%, 0 100%)",
      };
    case "slat":
      return {
        radius: `${Math.min(r, 10)}px 0 0 ${Math.min(r, 10)}px`,
        extraShadow: join(`inset -8px 0 0 0 ${accent}`, baseShadow),
      };
    case "diptych":
      return {
        radius: "0px",
        extraShadow: join(
          `inset 4px 0 0 0 ${accent}`,
          `inset -4px 0 0 0 ${dark ? veil : ink}`,
          `inset 0 0 0 1px ${veil}`,
          baseShadow,
        ),
      };
    default:
      return { radius: `${r}px`, extraShadow: baseShadow };
  }
}
