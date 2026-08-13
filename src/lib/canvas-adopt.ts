// -----------------------------------------------------------------------------
// Adopting module sections into canvas blocks
// -----------------------------------------------------------------------------
// The free canvas could only move objects the user ADDED. Everything the module
// itself painted — its headline, its stat tiles, its photo plates — was locked
// inside the renderer, so "move that photo 40px left" meant editing code.
//
// Adoption closes that gap without forking the renderer: the element the user
// clicks is measured in place, converted into a real CanvasBlock with the same
// geometry / type / colour, and the ORIGINAL is hidden by a DOM path recorded on
// the block. From that moment the section behaves like any other canvas object
// (drag, resize, retype, layer, group, export) and "Reset" simply deletes the
// block and un-hides the source.
//
// Geometry is normalised to the 1920x1080 stage, so an adopted block lands
// pixel-exactly where the module drew it regardless of the preview's scale.
// -----------------------------------------------------------------------------

import type { CanvasBlock, CanvasBlockKind } from "@/lib/deck-store";
import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";

/** Marks editor chrome so hit-testing can look straight through it. */
export const CANVAS_UI_ATTR = "data-canvas-ui";

/** Smallest adoptable box, in stage units — below this it's a hairline or dot. */
const MIN_ADOPT = 12;

/**
 * A stable-enough CSS path from `root` to `el`, using nth-child so it does not
 * depend on class names (which change with brand mode and style packs).
 */
export function domPath(el: Element, root: Element): string | null {
  if (el === root || !root.contains(el)) return null;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
    parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${idx})`);
    node = parent;
  }
  return parts.length ? parts.join(" > ") : null;
}

/** Every element in `root` matching a recorded adoption path. */
export function resolveAdopted(root: Element, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(`:scope > ${selector}`));
  } catch {
    return [];
  }
}

function rgbToHex(color: string): string | undefined {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return /^#[0-9a-f]{3,8}$/i.test(color) ? color : undefined;
  const [r, g, b, a] = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
  if (a !== undefined && a < 0.05) return undefined;
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Text leaf = has visible text of its own and no child element that owns text. */
function isTextLeaf(el: Element): boolean {
  const own = (el.textContent ?? "").trim();
  if (!own) return false;
  for (const child of Array.from(el.children))
    if ((child.textContent ?? "").trim().length > 0) return false;
  return true;
}

function kindForFont(px: number): CanvasBlockKind {
  if (px >= 64) return "heading";
  if (px >= 30) return "body";
  return "caption";
}

function weightOf(px: string): 400 | 500 | 600 | 700 {
  const n = Number.parseInt(px, 10);
  if (!Number.isFinite(n)) return 500;
  if (n >= 700) return 700;
  if (n >= 600) return 600;
  if (n >= 500) return 500;
  return 400;
}

export type AdoptCandidate = {
  el: Element;
  /** Stage-unit box, ready for a canvas block. */
  box: { x: number; y: number; w: number; h: number };
};

/**
 * Is this element something a user would think of as "a thing on the slide"?
 * Text leaves, pictures and inline vectors qualify; layout wrappers do not.
 */
export function isAdoptable(el: Element): boolean {
  if (el.closest(`[${CANVAS_UI_ATTR}]`)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "img" || tag === "svg" || tag === "video" || tag === "canvas") return true;
  return isTextLeaf(el);
}

/**
 * Walk up from the clicked node to the nearest element a user means to grab:
 * the text leaf / picture itself, never the section wrapper.
 */
export function adoptTargetAt(root: Element, clientX: number, clientY: number): Element | null {
  const stack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : ([document.elementFromPoint(clientX, clientY)].filter(Boolean) as Element[]);
  for (const el of stack) {
    if (!root.contains(el)) continue;
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    if (isAdoptable(el)) return el;
    // A wrapper was hit (e.g. a padded tile): accept it only if it paints
    // something itself — a fill or a border — so plates can be adopted too.
    const cs = getComputedStyle(el);
    const painted =
      (cs.backgroundImage && cs.backgroundImage !== "none") ||
      (rgbToHex(cs.backgroundColor) !== undefined && cs.backgroundColor !== "rgba(0, 0, 0, 0)");
    if (painted) return el;
  }
  return null;
}

/** Stage-unit box for an element inside a (possibly scaled) stage root. */
export function stageBox(el: Element, root: Element) {
  const r = el.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const sx = rr.width ? STAGE_W / rr.width : 1;
  const sy = rr.height ? STAGE_H / rr.height : 1;
  return {
    x: Math.round((r.left - rr.left) * sx),
    y: Math.round((r.top - rr.top) * sy),
    w: Math.round(r.width * sx),
    h: Math.round(r.height * sy),
    scale: sx,
  };
}

/**
 * Convert a rendered module element into a canvas block. Returns null when the
 * element is too small to be meaningful or cannot be addressed by a DOM path.
 */
export function blockFromElement(
  el: Element,
  root: Element,
  idFactory: () => string,
): CanvasBlock | null {
  const selector = domPath(el, root);
  if (!selector) return null;
  const { x, y, w, h, scale } = stageBox(el, root);
  if (w < MIN_ADOPT || h < MIN_ADOPT) return null;

  const cs = getComputedStyle(el);
  const tag = el.tagName.toLowerCase();
  const base = { id: idFactory(), x, y, w, h, sourceSelector: selector, text: "" };

  if (tag === "img") {
    const img = el as HTMLImageElement;
    return {
      ...base,
      kind: "image",
      src: img.currentSrc || img.src,
      alt: img.alt || undefined,
      fit: cs.objectFit === "contain" ? "contain" : "cover",
      radius: Math.round((Number.parseFloat(cs.borderTopLeftRadius) || 0) * scale),
    };
  }

  if (isTextLeaf(el)) {
    const px = (Number.parseFloat(cs.fontSize) || 40) * scale;
    return {
      ...base,
      kind: kindForFont(px),
      text: (el.textContent ?? "").trim(),
      size: Math.round(px),
      color: rgbToHex(cs.color),
      weight: weightOf(cs.fontWeight),
      align: cs.textAlign === "center" ? "center" : cs.textAlign === "right" ? "right" : "left",
    };
  }

  // Anything else (plates, tiles, inline vectors) becomes a shape carrying the
  // surface it painted, so the look survives the move.
  return {
    ...base,
    kind: "shape",
    fill: rgbToHex(cs.backgroundColor) ?? "rgba(255,255,255,0.16)",
    stroke: Number.parseFloat(cs.borderTopWidth) > 0 ? rgbToHex(cs.borderTopColor) : undefined,
    radius: Math.round((Number.parseFloat(cs.borderTopLeftRadius) || 0) * scale),
  };
}
