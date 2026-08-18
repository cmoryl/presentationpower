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

/**
 * Surface colour for an adopted PLATE, alpha intact.
 *
 * Glass tiles paint themselves with something like `rgba(255,255,255,0.06)`.
 * Flattening that to `#ffffff` (what rgbToHex does, and what adoption used to
 * record) turns a barely-there veil into an opaque white slab that buries the
 * card's own title and copy — the "my slide went blank after clicking in" bug.
 */
function surfaceCss(color: string): string | undefined {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return /^#[0-9a-f]{3,8}$/i.test(color) ? color : undefined;
  const [r, g, b, a] = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
  const alpha = a === undefined ? 1 : a;
  if (alpha < 0.02) return undefined;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(alpha.toFixed(3))})`;
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
    fill: surfaceCss(cs.backgroundColor) ?? "rgba(255,255,255,0.10)",
    // Only a genuine four-sided CSS border becomes a stroke; single accent
    // edges must not widen into a full outline.
    stroke:
      [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].every(
        (w) => (Number.parseFloat(w) || 0) > 0,
      ) && cs.borderTopStyle !== "none"
        ? surfaceCss(cs.borderTopColor)
        : undefined,
    radius: Math.round((Number.parseFloat(cs.borderTopLeftRadius) || 0) * scale),
  };
}

/**
 * Stage-unit boxes for the sections the module itself painted, used as snap
 * targets while dragging/resizing canvas blocks. Hidden (already adopted)
 * sources and editor chrome are skipped, tiny slivers are dropped, and
 * near-duplicate boxes are collapsed so the target list stays small enough to
 * scan on every pointer-move.
 */
export function moduleSnapBoxes(
  root: Element,
  limit = 120,
): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  const seen = new Set<string>();
  const nodes = root.querySelectorAll<HTMLElement>("*");
  for (const el of Array.from(nodes)) {
    if (out.length >= limit) break;
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) continue;
    const painted =
      el.tagName.toLowerCase() === "img" ||
      el.tagName.toLowerCase() === "svg" ||
      isTextLeaf(el) ||
      (cs.backgroundImage && cs.backgroundImage !== "none") ||
      (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent");
    if (!painted) continue;
    const box = stageBox(el, root);
    if (box.w < MIN_ADOPT * 2 || box.h < MIN_ADOPT) continue;
    // Full-bleed backdrops duplicate the slide edges — no value as a target.
    if (box.w >= STAGE_W - 2 && box.h >= STAGE_H - 2) continue;
    const key = `${Math.round(box.x / 4)}:${Math.round(box.y / 4)}:${Math.round(box.w / 4)}:${Math.round(box.h / 4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ x: box.x, y: box.y, w: box.w, h: box.h });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Adopting a WHOLE card (bento tile) instead of a single leaf
// -----------------------------------------------------------------------------
// Picking one text leaf at a time made "move that bento box" a five-click chore
// and made "duplicate that box" impossible: there was never one thing to copy.
// Card adoption walks up from the click to the nearest element that reads as a
// card — a bounded, painted box that holds its own icon + label + copy — then
// converts the plate AND its contents into one GROUPED set of blocks. From then
// on the tile drags, resizes, duplicates and layers as a single object.
// -----------------------------------------------------------------------------

/** Cards live between "a chip" and "half the slide". */
const CARD_MIN_W = 160;
const CARD_MIN_H = 110;

function paintsSurface(cs: CSSStyleDeclaration): boolean {
  if (cs.backgroundImage && cs.backgroundImage !== "none") return true;
  if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent")
    return true;
  return (Number.parseFloat(cs.borderTopWidth) || 0) > 0 && cs.borderTopStyle !== "none";
}

/** Direct-ish content leaves inside a card: text runs, pictures, inline icons. */
function cardLeaves(card: Element): Element[] {
  const out: Element[] = [];
  for (const el of Array.from(card.querySelectorAll("*"))) {
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "svg") {
      // Only the outermost svg — never its paths.
      if (el.parentElement?.closest("svg")) continue;
      out.push(el);
      continue;
    }
    if (el.closest("svg")) continue;
    if (tag === "img" || tag === "video") {
      out.push(el);
      continue;
    }
    if (isTextLeaf(el)) out.push(el);
  }
  return out;
}

/**
 * The nearest ancestor of the click that a user would call "this box": a
 * painted, card-sized container holding at least two pieces of content.
 * Falls back to null when the click is on loose slide furniture.
 */
export function cardTargetAt(root: Element, clientX: number, clientY: number): Element | null {
  const hit = document.elementFromPoint(clientX, clientY);
  if (!hit || !root.contains(hit) || hit.closest(`[${CANVAS_UI_ATTR}]`)) return null;
  let node: Element | null = hit;
  let fallback: Element | null = null;
  while (node && node !== root) {
    const box = stageBox(node, root);
    if (box.w >= STAGE_W - 4 && box.h >= STAGE_H - 4) break;
    if (box.w >= CARD_MIN_W && box.h >= CARD_MIN_H && box.w <= STAGE_W * 0.75) {
      const cs = getComputedStyle(node);
      const leaves = cardLeaves(node);
      if (leaves.length >= 2) {
        if (paintsSurface(cs)) return node;
        fallback = fallback ?? node;
      }
    }
    node = node.parentElement;
  }
  return fallback;
}

/** Inline SVG icons survive the move by being frozen into a data URL. */
export function svgToDataUrl(el: Element): string | null {
  try {
    const clone = el.cloneNode(true) as SVGElement;
    const cs = getComputedStyle(el);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const r = el.getBoundingClientRect();
    if (!clone.getAttribute("viewBox") && r.width && r.height) {
      clone.setAttribute("viewBox", `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
    }
    clone.setAttribute("width", String(Math.max(1, Math.round(r.width))));
    clone.setAttribute("height", String(Math.max(1, Math.round(r.height))));
    // `currentColor` has no meaning once detached — bake the rendered ink in.
    clone.style.color = cs.color;
    return `data:image/svg+xml;utf8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  } catch {
    return null;
  }
}

/**
 * Convert a whole card into one grouped set of canvas blocks: the plate first
 * (so it sits behind), then every content leaf in place. All of them carry the
 * same groupId, so selecting any part grabs the whole tile.
 */
export function blocksFromCard(
  card: Element,
  root: Element,
  idFactory: () => string,
): CanvasBlock[] {
  const plate = blockFromElement(card, root, idFactory);
  if (!plate) return [];
  const groupId = `grp-${Math.random().toString(36).slice(2, 8)}`;
  const out: CanvasBlock[] = [{ ...plate, kind: "shape", text: "", groupId }];
  for (const leaf of cardLeaves(card)) {
    if (leaf.tagName.toLowerCase() === "svg") {
      const src = svgToDataUrl(leaf);
      const box = stageBox(leaf, root);
      const selector = domPath(leaf, root);
      if (!src || !selector || box.w < MIN_ADOPT || box.h < MIN_ADOPT) continue;
      out.push({
        id: idFactory(),
        kind: "image",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        text: "",
        src,
        fit: "contain",
        sourceSelector: selector,
        groupId,
      });
      continue;
    }
    const block = blockFromElement(leaf, root, idFactory);
    if (block) out.push({ ...block, groupId });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Adopting the WHOLE slide at once
// -----------------------------------------------------------------------------
// Clicking section-by-section was fine for a tweak, but opening a module (or any
// deck slide) and finding "no objects yet" made the layers pane feel empty even
// though the slide was full of content. `adoptAllFromModule` walks the rendered
// module once and converts everything a user would call a layer — cards as
// grouped tiles, then loose headlines, captions, pictures and icons — into real
// canvas blocks sitting exactly where the module drew them. Nothing moves; the
// slide just becomes editable, and every block still carries its source path so
// Reset gives the section back to the module.
// -----------------------------------------------------------------------------

/** Ceiling so a pathological render can never produce thousands of blocks. */
const MAX_ADOPT_ALL = 120;

function isVisible(el: Element): boolean {
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none") return false;
  if (Number(cs.opacity) < 0.05) return false;
  return true;
}

/** Card-like containers that are not nested inside another chosen card. */
function topLevelCards(root: Element): Element[] {
  const found: Element[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    if (!isVisible(el)) continue;
    const box = stageBox(el, root);
    if (box.w < CARD_MIN_W || box.h < CARD_MIN_H) continue;
    if (box.w > STAGE_W * 0.75) continue;
    if (!paintsSurface(getComputedStyle(el))) continue;
    if (cardLeaves(el).length < 2) continue;
    if (found.some((c) => c.contains(el) || el.contains(c))) continue;
    found.push(el);
  }
  return found;
}

/**
 * Every editable layer on the rendered slide, in paint order: card tiles first
 * (grouped), then the loose text / image / icon leaves that live outside them.
 * `existing` selectors are skipped so re-running never stacks duplicates.
 */
export function adoptAllFromModule(
  root: Element,
  idFactory: () => string,
  existing: readonly string[] = [],
): CanvasBlock[] {
  const taken = new Set(existing);
  const out: CanvasBlock[] = [];
  const cards = topLevelCards(root);

  for (const card of cards) {
    if (out.length >= MAX_ADOPT_ALL) break;
    const sel = domPath(card, root);
    if (!sel || taken.has(sel)) continue;
    const made = blocksFromCard(card, root, idFactory).filter(
      (b) => !b.sourceSelector || !taken.has(b.sourceSelector),
    );
    for (const b of made) {
      if (b.sourceSelector) taken.add(b.sourceSelector);
      out.push(b);
    }
  }

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (out.length >= MAX_ADOPT_ALL) break;
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    if (cards.some((c) => c === el || c.contains(el))) continue;
    if (!isVisible(el)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "svg") {
      if (el.parentElement?.closest("svg")) continue;
      const sel = domPath(el, root);
      const box = stageBox(el, root);
      const src = svgToDataUrl(el);
      if (!sel || taken.has(sel) || !src || box.w < MIN_ADOPT || box.h < MIN_ADOPT) continue;
      taken.add(sel);
      out.push({
        id: idFactory(),
        kind: "image",
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
        text: "",
        src,
        fit: "contain",
        sourceSelector: sel,
      });
      continue;
    }
    if (el.closest("svg")) continue;
    if (!(tag === "img" || tag === "video" || isTextLeaf(el))) continue;
    const sel = domPath(el, root);
    if (!sel || taken.has(sel)) continue;
    const box = stageBox(el, root);
    // Full-bleed wrappers are the slide itself, not a layer.
    if (box.w >= STAGE_W - 2 && box.h >= STAGE_H - 2) continue;
    const block = blockFromElement(el, root, idFactory);
    if (!block) continue;
    taken.add(sel);
    out.push(block);
  }

  return out;
}

// -----------------------------------------------------------------------------
// Recovering a source when its recorded path no longer resolves
// -----------------------------------------------------------------------------
// A block's `sourceSelector` is an nth-child path recorded against the surface
// that adopted it. Every other surface (the read-only overlay in the editor
// preview, thumbnails, present, share) renders the same module inside a slightly
// different wrapper tree, so that path can miss — and a miss means the original
// stays visible UNDER its adopted copy, which reads as duplicated, doubled text.
//
// This is the safety net: when the path resolves to nothing, find the element
// the block was made from by what it looks like — same text (or same picture)
// sitting in roughly the same place on the stage.
// -----------------------------------------------------------------------------

const MATCH_TOL = 26; // stage units of slack on each edge

export function matchAdoptedElement(
  root: Element,
  block: {
    sourceSelector?: string;
    kind: string;
    text?: string;
    x: number;
    y: number;
    w: number;
    h: number;
  },
): Element | null {
  const wanted = (block.text ?? "").trim();
  const isText = block.kind === "heading" || block.kind === "body" || block.kind === "caption";
  if (isText && !wanted) return null;
  let best: { el: Element; d: number } | null = null;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (el.closest(`[${CANVAS_UI_ATTR}]`)) continue;
    const tag = el.tagName.toLowerCase();
    if (isText) {
      if (!isTextLeaf(el)) continue;
      if ((el.textContent ?? "").trim() !== wanted) continue;
    } else if (block.kind === "image") {
      if (tag !== "img" && tag !== "svg") continue;
    } else {
      continue; // shapes/plates are ambiguous by look — never guess
    }
    const box = stageBox(el, root);
    const d =
      Math.abs(box.x - block.x) +
      Math.abs(box.y - block.y) +
      Math.abs(box.w - block.w) +
      Math.abs(box.h - block.h);
    if (d > MATCH_TOL * 4) continue;
    if (!best || d < best.d) best = { el, d };
  }
  return best?.el ?? null;
}
