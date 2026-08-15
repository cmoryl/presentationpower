/**
 * PACK GEOMETRY — per-style box shapes and section layouts.
 *
 * Two styles can share a palette and still feel unrelated if their *boxes* and
 * their *section layouts* differ. This module gives every style (catalog skin
 * and built-in pack alike) its own:
 *
 *   • CARD SHAPE — corner language, edge accents, ring/offset treatments.
 *   • SECTION LAYOUT — how the cover, stat wall, grid and rules compose.
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
  | "double"; // double ring outline

export type CoverLayout = "baseline" | "centered" | "split" | "banded" | "stacked";
export type StatLayout = "cards4" | "cards3" | "rail" | "band";
export type GridLayout = "bento" | "mosaic" | "columns" | "stack";
export type RuleLayout = "bar" | "dots" | "hairline" | "none";

export interface PackLayout {
  cover: CoverLayout;
  stats: StatLayout;
  grid: GridLayout;
  rule: RuleLayout;
}

export interface PackGeometry {
  shape: CardShape;
  layout: PackLayout;
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
];
const COVERS: CoverLayout[] = ["baseline", "centered", "split", "banded", "stacked"];
const STATS: StatLayout[] = ["cards4", "cards3", "rail", "band"];
const GRIDS: GridLayout[] = ["bento", "mosaic", "columns", "stack"];
const RULES: RuleLayout[] = ["bar", "dots", "hairline", "none"];

/**
 * HAND-ASSIGNED SHEET for the catalog languages S01–S28. Each row pairs a box
 * shape with a section layout family that suits the language's register, and no
 * two rows repeat the same full combination.
 */
export const SKIN_GEOMETRY: Record<string, PackGeometry> = {
  S01: { shape: "round", layout: { cover: "baseline", stats: "cards4", grid: "bento", rule: "bar" } },
  S02: { shape: "capsule", layout: { cover: "centered", stats: "cards3", grid: "mosaic", rule: "dots" } },
  S03: { shape: "leaf", layout: { cover: "split", stats: "cards4", grid: "columns", rule: "bar" } },
  S04: { shape: "notch", layout: { cover: "stacked", stats: "rail", grid: "mosaic", rule: "hairline" } },
  S05: { shape: "underline", layout: { cover: "baseline", stats: "band", grid: "columns", rule: "hairline" } },
  S06: { shape: "bracket", layout: { cover: "split", stats: "cards3", grid: "bento", rule: "bar" } },
  S07: { shape: "round", layout: { cover: "centered", stats: "cards4", grid: "mosaic", rule: "dots" } },
  S08: { shape: "capsule", layout: { cover: "banded", stats: "cards3", grid: "stack", rule: "bar" } },
  S09: { shape: "double", layout: { cover: "stacked", stats: "rail", grid: "columns", rule: "dots" } },
  S10: { shape: "round", layout: { cover: "split", stats: "band", grid: "bento", rule: "hairline" } },
  S11: { shape: "underline", layout: { cover: "baseline", stats: "cards4", grid: "columns", rule: "bar" } },
  S12: { shape: "tab", layout: { cover: "stacked", stats: "band", grid: "mosaic", rule: "hairline" } },
  S13: { shape: "round", layout: { cover: "banded", stats: "cards4", grid: "stack", rule: "dots" } },
  S14: { shape: "offset", layout: { cover: "split", stats: "band", grid: "columns", rule: "none" } },
  S15: { shape: "ticket", layout: { cover: "centered", stats: "rail", grid: "stack", rule: "hairline" } },
  S16: { shape: "double", layout: { cover: "centered", stats: "rail", grid: "mosaic", rule: "none" } },
  S17: { shape: "leaf", layout: { cover: "banded", stats: "cards3", grid: "bento", rule: "dots" } },
  S18: { shape: "notch", layout: { cover: "baseline", stats: "cards3", grid: "mosaic", rule: "bar" } },
  S19: { shape: "bracket", layout: { cover: "stacked", stats: "band", grid: "columns", rule: "hairline" } },
  S20: { shape: "ticket", layout: { cover: "split", stats: "rail", grid: "bento", rule: "dots" } },
  S21: { shape: "capsule", layout: { cover: "centered", stats: "cards4", grid: "stack", rule: "bar" } },
  S22: { shape: "underline", layout: { cover: "banded", stats: "rail", grid: "stack", rule: "hairline" } },
  S23: { shape: "offset", layout: { cover: "stacked", stats: "cards3", grid: "columns", rule: "none" } },
  S24: { shape: "leaf", layout: { cover: "centered", stats: "band", grid: "bento", rule: "bar" } },
  S25: { shape: "tab", layout: { cover: "baseline", stats: "cards4", grid: "mosaic", rule: "none" } },
  S26: { shape: "round", layout: { cover: "stacked", stats: "cards3", grid: "bento", rule: "dots" } },
  S27: { shape: "capsule", layout: { cover: "split", stats: "rail", grid: "mosaic", rule: "bar" } },
  S28: { shape: "bracket", layout: { cover: "banded", stats: "cards4", grid: "columns", rule: "dots" } },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Resolve geometry for any pack: declared sheet first, stable hash otherwise. */
export function packGeometry(pack: StylePack): PackGeometry {
  if (pack.layout && pack.card.shape) return { shape: pack.card.shape, layout: pack.layout };
  const h = hash(pack.id);
  const hard = pack.card.radius <= 4;
  const shapePool = hard
    ? (["offset", "notch", "underline", "bracket", "double", "ticket"] as CardShape[])
    : (["round", "capsule", "leaf", "tab", "bracket", "underline"] as CardShape[]);
  return {
    shape: pack.card.shape ?? shapePool[h % shapePool.length]!,
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
        extraShadow: join(`0 0 0 1px ${accent}`, `0 0 0 5px ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`, baseShadow),
      };
    default:
      return { radius: `${r}px`, extraShadow: baseShadow };
  }
}
