// -----------------------------------------------------------------------------
// "Make editable": exploding a preset module into personal canvas items
// -----------------------------------------------------------------------------
// Dropping a module onto a blank studio slide used to give one opaque object:
// the renderer painted it, so the headline, the plates, the icons and the photos
// were all untouchable. This module measures the LIVE render in place and
// converts every painted piece into an ordinary studio item — surfaces, text
// fields, images (inline SVG icons frozen to data URLs) — at the exact geometry
// the module drew, in stage units. After the swap the module item is gone and
// everything on the slide is the user's own, fully editable and exportable.
// -----------------------------------------------------------------------------

import { nanoid } from "nanoid";
import { CANVAS_UI_ATTR, svgToDataUrl } from "@/lib/canvas-adopt";
import {
  STAGE_H,
  STAGE_W,
  type CanvasItem,
  type ImageItem,
  type SurfaceItem,
  type TextItem,
} from "@/lib/canvas-studio";

/** Below this (stage units) a piece is a hairline or a dot — not worth a layer. */
const MIN_PIECE = 10;
/** Hard cap so a dense module cannot produce an unusable layer list. */
const MAX_PIECES = 160;

type Box = { x: number; y: number; w: number; h: number };

function hexFrom(color: string): string | undefined {
  if (!color) return undefined;
  if (/^#[0-9a-f]{3,8}$/i.test(color.trim())) return color.trim();
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return undefined;
  const parts = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
  const [r, g, b, a] = parts;
  if (a !== undefined && a < 0.04) return undefined;
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n || 0))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Alpha of a CSS colour, 1 when opaque or unparseable. */
function alphaFrom(color: string): number {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
  return parts[3] === undefined ? 1 : Math.max(0, Math.min(1, parts[3]));
}

/**
 * Gradients and images cannot survive as a studio surface fill that also
 * exports cleanly, so take the first concrete colour out of the gradient.
 */
function fillFromBackground(cs: CSSStyleDeclaration): { fill: string; opacity: number } | null {
  const solid = hexFrom(cs.backgroundColor);
  if (solid) return { fill: solid, opacity: alphaFrom(cs.backgroundColor) };
  const img = cs.backgroundImage;
  if (img && img !== "none") {
    const first = img.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/i);
    const hex = first ? hexFrom(first[0]) : undefined;
    if (hex) return { fill: hex, opacity: Math.max(0.35, first ? alphaFrom(first[0]) : 1) };
  }
  return null;
}

/**
 * Corner radius in stage units. Computed radii arrive as px OR as a percentage
 * (`50%` for pills and orbs), and pill values such as `9999px` scale into
 * nonsense once multiplied by the module's own transform. Either way a radius
 * can never exceed half the shorter side, so clamp it there.
 */
function radiusOf(value: string, box: { w: number; h: number; px: number }): number {
  const n = Number.parseFloat(value) || 0;
  if (n <= 0) return 0;
  const cap = Math.floor(Math.min(box.w, box.h) / 2);
  const raw = value.trim().endsWith("%") ? (Math.min(box.w, box.h) * n) / 100 : n * box.px;
  return Math.max(0, Math.min(cap, Math.round(raw)));
}

function isTextLeaf(el: Element): boolean {
  if (!(el.textContent ?? "").trim()) return false;
  for (const child of Array.from(el.children))
    if ((child.textContent ?? "").trim().length > 0) return false;
  return true;
}

function weightOf(v: string): 400 | 500 | 600 | 700 {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return 500;
  if (n >= 700) return 700;
  if (n >= 600) return 600;
  if (n >= 500) return 500;
  return 400;
}

/**
 * Element box in stage units, measured against the scaled stage plane.
 *
 * `px` converts a COMPUTED CSS length (font size, radius) into stage units.
 * A module render is nested inside its own CSS transform, so the computed
 * lengths are in the module's un-transformed space — they must be multiplied by
 * the element's own visual scale (rect width vs layout width) before the
 * stage-per-screen ratio, otherwise text explodes to several times its size.
 */
function boxIn(el: Element, stage: Element): Box & { scale: number; px: number } {
  const r = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const sx = s.width ? STAGE_W / s.width : 1;
  const sy = s.height ? STAGE_H / s.height : 1;
  const layoutW = (el as HTMLElement).offsetWidth || 0;
  const visual = layoutW > 0 && r.width > 0 ? r.width / layoutW : 1;
  return {
    x: Math.round((r.left - s.left) * sx),
    y: Math.round((r.top - s.top) * sy),
    w: Math.round(r.width * sx),
    h: Math.round(r.height * sy),
    scale: sx,
    px: visual * sx,
  };
}

function visible(cs: CSSStyleDeclaration): boolean {
  return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) >= 0.05;
}

export type ExplodeResult = {
  items: CanvasItem[];
  counts: { surfaces: number; text: number; images: number };
  truncated: boolean;
};

/**
 * Convert a rendered module (`moduleEl`, the item's live wrapper) into plain
 * studio items positioned against the 1920×1080 `stageEl` plane.
 *
 * Surfaces are emitted first (bottom of the stack), then imagery, then text, so
 * the exploded copy reads the same as the module did.
 */
export function explodeModuleRender(
  moduleEl: Element,
  stageEl: Element,
  startZ: number,
): ExplodeResult {
  const surfaces: SurfaceItem[] = [];
  const images: ImageItem[] = [];
  const texts: TextItem[] = [];
  let truncated = false;

  const seenSurface = new Set<string>();
  const nodes = Array.from(moduleEl.querySelectorAll<HTMLElement>("*"));

  for (const el of nodes) {
    if (surfaces.length + images.length + texts.length >= MAX_PIECES) {
      truncated = true;
      break;
    }
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    const tag = el.tagName.toLowerCase();
    // Never walk into an svg — the whole icon becomes one image.
    if (tag !== "svg" && el.closest("svg")) continue;

    const cs = getComputedStyle(el);
    if (!visible(cs)) continue;
    const box = boxIn(el, stageEl);
    if (box.w < MIN_PIECE || box.h < MIN_PIECE) continue;
    if (box.x > STAGE_W || box.y > STAGE_H || box.x + box.w < 0 || box.y + box.h < 0) continue;

    if (tag === "svg") {
      const url = svgToDataUrl(el);
      if (!url) continue;
      images.push({
        id: `ci-${nanoid(8)}`,
        z: 0,
        type: "image",
        url,
        fit: "contain",
        radius: 0,
        name: "Icon",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
      });
      continue;
    }

    if (tag === "img") {
      const img = el as HTMLImageElement;
      const url = img.currentSrc || img.src;
      if (!url) continue;
      images.push({
        id: `ci-${nanoid(8)}`,
        z: 0,
        type: "image",
        url,
        fit: cs.objectFit === "contain" ? "contain" : "cover",
        radius: radiusOf(cs.borderTopLeftRadius, box),
        alt: img.alt || undefined,
        name: "Photo",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
      });
      continue;
    }

    if (isTextLeaf(el)) {
      const size = Math.max(10, Math.round((Number.parseFloat(cs.fontSize) || 32) * box.px));
      const raw = (el.textContent ?? "").trim();
      if (!raw) continue;
      const upper = cs.textTransform === "uppercase";
      const align = cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "right" : "left";
      // The DOM box hugs the glyphs exactly. PowerPoint measures the same string
      // with its own font metrics plus text-box inset, so a pixel-tight box wraps
      // the last word onto a new line. Give single-line runs a little slack.
      const singleLine = box.h < size * 1.6;
      const slack = singleLine ? Math.max(12, Math.round(size * 0.55)) : 0;
      const w = Math.min(STAGE_W, Math.max(40, box.w + slack));
      const shift = align === "center" ? (w - box.w) / 2 : align === "right" ? w - box.w : 0;
      texts.push({
        id: `ci-${nanoid(8)}`,
        z: 0,
        type: "text",
        text: upper ? raw.toUpperCase() : raw,
        size,
        weight: weightOf(cs.fontWeight),
        align,
        color: hexFrom(cs.color),
        name: raw.slice(0, 28),
        x: Math.max(0, Math.min(STAGE_W - w, Math.round(box.x - shift))),
        y: box.y,
        w,
        h: Math.max(size + 6, box.h),
      });
      continue;
    }

    // Painted containers become surfaces: plates, rules, accent bars, backdrops.
    const paint = fillFromBackground(cs);
    const border =
      (Number.parseFloat(cs.borderTopWidth) || 0) > 0 && cs.borderTopStyle !== "none"
        ? hexFrom(cs.borderTopColor)
        : undefined;
    if (!paint && !border) continue;
    const key = `${Math.round(box.x / 3)}:${Math.round(box.y / 3)}:${Math.round(box.w / 3)}:${Math.round(box.h / 3)}`;
    if (seenSurface.has(key)) continue;
    seenSurface.add(key);
    surfaces.push({
      id: `ci-${nanoid(8)}`,
      z: 0,
      type: "surface",
      fill: paint?.fill ?? "#FFFFFF",
      stroke: border,
      radius: radiusOf(cs.borderTopLeftRadius, box),
      // The element's own opacity multiplies its paint alpha, so soft aurora
      // orbs and frosted plates stay soft instead of flattening to solid ink.
      opacity: paint
        ? Number(
            Math.max(
              0.02,
              Math.min(1, paint.opacity * (Number.isFinite(Number(cs.opacity)) ? Number(cs.opacity) : 1)),
            ).toFixed(2),
          )
        : 0,
      name: box.w >= STAGE_W - 8 && box.h >= STAGE_H - 8 ? "Backdrop" : "Surface",
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
    });
  }

  // Big surfaces sit under small ones so plates never bury their own tiles.
  surfaces.sort((a, b) => b.w * b.h - a.w * a.h);

  const ordered: CanvasItem[] = [...surfaces, ...images, ...texts].map((item, i) => ({
    ...item,
    z: startZ + i,
  })) as CanvasItem[];

  return {
    items: ordered,
    counts: { surfaces: surfaces.length, text: texts.length, images: images.length },
    truncated,
  };
}
