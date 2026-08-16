// -----------------------------------------------------------------------------
// Generic DOM → native PowerPoint decomposition
//
// Only ~120 of the 190 module variants have a hand-written OOXML renderer. The
// rest used to export as a flattened graphic plate: one PNG of the whole slide
// with editable text floated over it. That satisfied "looks like the build" but
// broke "everything is editable" — cards, bars, pills, arrows, icons, logos and
// photographs were baked into the picture.
//
// This module closes that gap generically. It walks the SETTLED content planes
// of the real renderer (ExactSlideStage) and measures every painted box:
// geometry, corner radius, solid/gradient fill, stroke, shadow, rotation — plus
// every <img>, <svg> and <canvas>. `export-dom-place.ts` re-emits those records
// as native PowerPoint shapes and pictures, so the exported slide is made of
// independently selectable objects for EVERY module, not just the curated list.
//
// The decor planes (aurora ground, scaffold, motif, grain) stay on the
// decor-only plate: they are CSS-only radial/blend compositions with no OOXML
// equivalent, and they are background — not content the user edits.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";
import { resolveSvgMarkupVars } from "./export-svg-vars";
import { classifyEffectStyle, effectSvgDataUrl } from "./export-effect-style";


export interface DomColor {
  /** 6-digit uppercase hex, no `#`. */
  hex: string;
  /** 0-1. */
  alpha: number;
}

export interface DomGradient {
  /** CSS gradient angle in degrees (0 = to top, 90 = to right). */
  angleDeg: number;
  stops: Array<{ color: DomColor; pos: number }>;
}

export interface DomShadow {
  blurPx: number;
  offsetPx: number;
  angleDeg: number;
  color: DomColor;
}

export interface DomShape {
  kind: "rect" | "roundRect" | "ellipse" | "image";
  /** Stage px (1920×1080 space). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Uniform corner radius in stage px (0 = square). */
  radiusPx: number;
  fill: DomColor | null;
  gradient: DomGradient | null;
  line: (DomColor & { widthPx: number }) | null;
  shadow: DomShadow | null;
  /** Image payload: data URL or absolute URL. */
  src?: string;
  /**
   * Intrinsic pixel size of the artwork, when the DOM can report it
   * (`naturalWidth` on <img>, viewBox on <svg>, bitmap size on <canvas>).
   * Placement uses this to compute an exact aspect-correct frame instead of
   * relying on pptxgenjs `sizing`, which cannot read data-URL dimensions and
   * therefore stretches logos to the placeholder box.
   */
  natW?: number;
  natH?: number;
  /** How the image fills its box. */
  fit?: "cover" | "contain" | "fill";

  rotationDeg: number;
  name: string;
  /** The element this record was measured from (not serializable). */
  node?: Element;
}

const CONTENT_PLANES = [
  "[data-slide-content-plane]",
  "[data-slide-logo-plane]",
  "[data-slide-footer-plane]",
];

/** Boxes smaller than this in both axes are noise (carets, 1px seams). */
const MIN_SIDE_PX = 2;
/** Alpha below this reads as "not painted". */
const MIN_ALPHA = 0.04;

let probeCtx: CanvasRenderingContext2D | null | undefined;

function hex3(r: number, g: number, b: number): string {
  const hx = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
  return `${hx(r)}${hx(g)}${hx(b)}`;
}

/** Resolve ANY CSS colour (rgb, oklch, color-mix, lab…) to hex + alpha. */
export function resolveCssColor(css: string | undefined | null): DomColor | null {
  if (!css) return null;
  const s = css.trim();
  if (!s || s === "none" || s === "transparent") return null;
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((p) => (p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p)));
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    if (Number.isFinite(r)) return { hex: hex3(r, g, b), alpha: Number.isFinite(a) ? a : 1 };
  }
  if (probeCtx === undefined) {
    try {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      probeCtx = c.getContext("2d", { willReadFrequently: true });
    } catch {
      probeCtx = null;
    }
  }
  if (!probeCtx) return null;
  try {
    probeCtx.clearRect(0, 0, 1, 1);
    probeCtx.fillStyle = "#000000";
    probeCtx.fillStyle = s;
    probeCtx.fillRect(0, 0, 1, 1);
    const d = probeCtx.getImageData(0, 0, 1, 1).data;
    return { hex: hex3(d[0], d[1], d[2]), alpha: d[3] / 255 };
  } catch {
    return null;
  }
}

/** Split a CSS function argument list on top-level commas. */
function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const SIDE_ANGLES: Record<string, number> = {
  "to top": 0,
  "to right": 90,
  "to bottom": 180,
  "to left": 270,
  "to top right": 45,
  "to right top": 45,
  "to bottom right": 135,
  "to right bottom": 135,
  "to bottom left": 225,
  "to left bottom": 225,
  "to top left": 315,
  "to left top": 315,
};

/**
 * Parse the FIRST linear-gradient in a computed `background-image`. Radial and
 * conic gradients have no faithful OOXML form; they are reduced to their first
 * colour stop by `paintOf` so the box still carries the right tone.
 */
export function parseLinearGradient(bg: string): DomGradient | null {
  const idx = bg.indexOf("linear-gradient(");
  if (idx < 0) return null;
  // Balance parentheses from the opening bracket so nested rgb()/color-mix() survive.
  const open = bg.indexOf("(", idx);
  let depth = 0;
  let end = -1;
  for (let i = open; i < bg.length; i += 1) {
    if (bg[i] === "(") depth += 1;
    else if (bg[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  const args = splitTopLevel(bg.slice(open + 1, end));
  if (args.length === 0) return null;

  let angleDeg = 180;
  let first = 0;
  const head = args[0].toLowerCase();
  const deg = head.match(/^(-?[\d.]+)deg$/);
  if (deg) {
    angleDeg = ((parseFloat(deg[1]) % 360) + 360) % 360;
    first = 1;
  } else if (head.startsWith("to ")) {
    angleDeg = SIDE_ANGLES[head] ?? 180;
    first = 1;
  } else if (/^(-?[\d.]+)(rad|turn|grad)$/.test(head)) {
    const n = parseFloat(head);
    const unit = head.replace(/^-?[\d.]+/, "");
    const d = unit === "rad" ? (n * 180) / Math.PI : unit === "turn" ? n * 360 : n * 0.9;
    angleDeg = ((d % 360) + 360) % 360;
    first = 1;
  }

  const stops: Array<{ color: DomColor; pos: number }> = [];
  const raw = args.slice(first);
  raw.forEach((part, i) => {
    const pct = part.match(/(-?[\d.]+)%\s*$/);
    const colorText = pct ? part.slice(0, pct.index).trim() : part.trim();
    const color = resolveCssColor(colorText);
    if (!color) return;
    const pos = pct
      ? Math.max(0, Math.min(100, parseFloat(pct[1])))
      : raw.length === 1
        ? 0
        : (i / (raw.length - 1)) * 100;
    stops.push({ color, pos });
  });
  if (stops.length < 2) return null;
  stops.sort((a, b) => a.pos - b.pos);
  return { angleDeg, stops };
}

/** Parse the first `box-shadow` layer into PowerPoint's polar form. */
export function parseBoxShadow(css: string | undefined | null): DomShadow | null {
  if (!css || css === "none") return null;
  const first = splitTopLevel(css)[0];
  if (!first || /inset/i.test(first)) return null;
  const color = resolveCssColor(
    (first.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/i) ?? [])[0] ?? "",
  );
  const nums = [...first.matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1]));
  if (!color || nums.length < 2) return null;
  const [dx, dy, blur = 0] = nums;
  const offsetPx = Math.hypot(dx, dy);
  // CSS y grows down; PowerPoint measures the shadow angle clockwise from east.
  const angleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  return { blurPx: Math.max(0, blur), offsetPx, angleDeg, color };
}

function rotationOf(transform: string): number {
  if (!transform || transform === "none") return 0;
  const m = transform.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(",").map((v) => parseFloat(v));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const deg = (Math.atan2(b, a) * 180) / Math.PI;
  return Math.abs(deg) < 0.5 ? 0 : deg;
}

function radiusOf(cs: CSSStyleDeclaration, w: number, h: number): number {
  const vals = [
    cs.borderTopLeftRadius,
    cs.borderTopRightRadius,
    cs.borderBottomRightRadius,
    cs.borderBottomLeftRadius,
  ].map((v) => {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return 0;
    return v.trim().endsWith("%") ? (n / 100) * Math.min(w, h) : n;
  });
  const r = Math.max(...vals);
  return Math.min(r, Math.min(w, h) / 2);
}

type BorderSide = "top" | "right" | "bottom" | "left";

/** Per-side border read: width, style and resolved color for one edge. */
function sideBorder(
  cs: CSSStyleDeclaration,
  side: BorderSide,
): (DomColor & { widthPx: number }) | null {
  const cap = side[0].toUpperCase() + side.slice(1);
  const width = parseFloat((cs as unknown as Record<string, string>)[`border${cap}Width`]) || 0;
  if (width < 0.5) return null;
  const style = (cs as unknown as Record<string, string>)[`border${cap}Style`];
  if (!style || style === "none" || style === "hidden") return null;
  const color = resolveCssColor((cs as unknown as Record<string, string>)[`border${cap}Color`]);
  if (!color || color.alpha < MIN_ALPHA) return null;
  return { ...color, widthPx: width };
}

/**
 * EXPORT SPEC — a border only becomes an OOXML outline when the CSS actually
 * paints all four edges. Many modules use a single accent edge (`border-left`,
 * a top hairline, column rules); reading the max width across sides used to
 * turn those into a full rectangle outline, which is the stray frame reported
 * around card content in exported decks.
 */
function borderOf(cs: CSSStyleDeclaration): (DomColor & { widthPx: number }) | null {
  const sides: BorderSide[] = ["top", "right", "bottom", "left"];
  const read = sides.map((s) => sideBorder(cs, s));
  if (read.some((r) => r === null)) return null;
  const first = read[0]!;
  const uniform = read.every(
    (r) => r!.hex === first.hex && Math.abs(r!.alpha - first.alpha) < 0.04,
  );
  if (!uniform) return null;
  return { ...first, widthPx: Math.max(...read.map((r) => r!.widthPx)) };
}

/** Edges painted individually (accent rules) — exported as thin native bars. */
function partialEdgesOf(
  cs: CSSStyleDeclaration,
): { side: BorderSide; color: DomColor; widthPx: number }[] {
  if (borderOf(cs)) return [];
  const sides: BorderSide[] = ["top", "right", "bottom", "left"];
  const out: { side: BorderSide; color: DomColor; widthPx: number }[] = [];
  for (const side of sides) {
    const b = sideBorder(cs, side);
    if (b) out.push({ side, color: { hex: b.hex, alpha: b.alpha }, widthPx: b.widthPx });
  }
  return out;
}

/** The paint of an element's own background box, if any. */
function paintOf(cs: CSSStyleDeclaration): { fill: DomColor | null; gradient: DomGradient | null } {
  const bgImage = cs.backgroundImage || "";
  const gradient = parseLinearGradient(bgImage);
  if (gradient) return { fill: gradient.stops[0].color, gradient };
  const solid = resolveCssColor(cs.backgroundColor);
  if (solid && solid.alpha >= MIN_ALPHA) return { fill: solid, gradient: null };
  // Radial / conic decor inside content: keep its dominant tone so the object
  // still exists and can be restyled, rather than vanishing.
  if (/radial-gradient|conic-gradient/.test(bgImage)) {
    const firstColor = resolveCssColor(
      (bgImage.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/i) ?? [])[0] ?? "",
    );
    if (firstColor && firstColor.alpha >= MIN_ALPHA) return { fill: firstColor, gradient: null };
  }
  return { fill: null, gradient: null };
}

/**
 * True for a large, text-free radial/conic wash — an aurora orb or glow plane.
 * These belong to the flat backdrop raster, never to the native object layer.
 */
function isDiffuseDecor(el: Element, cs: CSSStyleDeclaration, w: number, h: number): boolean {
  const bg = cs.backgroundImage || "";
  if (!/radial-gradient|conic-gradient/.test(bg)) return false;
  if ((el.textContent ?? "").trim().length > 0) return false;
  const blurred = /blur\(/.test(cs.filter || "") || /blur\(/.test(cs.backdropFilter || "");
  const huge = w >= STAGE_W * 0.25 || h >= STAGE_H * 0.25;
  return blurred || huge;
}

function objectFitOf(cs: CSSStyleDeclaration): "cover" | "contain" | "fill" {
  const f = cs.objectFit;
  if (f === "contain" || f === "scale-down") return "contain";
  if (f === "fill" || f === "none") return "fill";
  return "cover";
}

/**
 * Serialize an <svg> exactly as the exporter ships it: currentColor frozen,
 * text families/weights pinned, and every `var()` resolved against the live
 * cascade. Exported so regression tests can assert on the shipped markup
 * instead of re-implementing the pipeline.
 */
export function serializeSvgForExport(el: SVGSVGElement, w: number, h: number): string | null {
  try {
    const url = svgDataUrl(el, w, h);
    if (!url) return null;
    return decodeURIComponent(escape(atob(url.split(",")[1] ?? "")));
  } catch {
    return null;
  }
}

/** Inline an <svg> element as a self-contained data URL (stays vector in PPTX). */
function svgDataUrl(el: SVGSVGElement, w: number, h: number): string | null {
  try {
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!clone.getAttribute("viewBox")) {
      const vw = el.viewBox?.baseVal?.width || w;
      const vh = el.viewBox?.baseVal?.height || h;
      clone.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    }
    clone.setAttribute("width", String(Math.max(1, Math.round(w))));
    clone.setAttribute("height", String(Math.max(1, Math.round(h))));
    // currentColor has no meaning once the SVG leaves the document.
    const ink = getComputedStyle(el).color;
    const walk = (node: Element, live: Element | null) => {
      for (const attr of ["fill", "stroke"]) {
        if (node.getAttribute(attr) === "currentColor") node.setAttribute(attr, ink);
      }
      const st = node.getAttribute("style");
      if (st && st.includes("currentColor")) {
        node.setAttribute("style", st.replace(/currentColor/g, ink));
      }
      // A standalone SVG is rasterized inside an <img>, which cannot reach the
      // page's web fonts. Without an explicit stack, gauge numerals fell back
      // to the UA serif. Freeze the computed family (plus its fallbacks) so the
      // glyphs stay in the brand sans lineage.
      const tag = node.tagName.toUpperCase();
      if ((tag === "TEXT" || tag === "TSPAN") && live) {
        const cs = getComputedStyle(live);
        if (!node.getAttribute("font-family")) {
          node.setAttribute("font-family", `${cs.fontFamily}, Arial, Helvetica, sans-serif`);
        }
        if (!node.getAttribute("font-weight") && cs.fontWeight) {
          node.setAttribute("font-weight", cs.fontWeight);
        }
      }
      const cloneKids = Array.from(node.children);
      const liveKids = live ? Array.from(live.children) : [];
      cloneKids.forEach((child, i) => walk(child, liveKids[i] ?? null));
    };
    walk(clone, el);
    if (!clone.getAttribute("fill") && !clone.getAttribute("style")) {
      clone.setAttribute("color", ink);
    }

    // Custom properties don't survive the trip out of the document: a
    // standalone SVG has no cascade, so `var(--slide-accent-text)` on an
    // accent arc or gradient stop would paint black. Resolve them against the
    // live element before serializing.
    const xml = resolveSvgMarkupVars(new XMLSerializer().serializeToString(clone), el);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;

  } catch {
    return null;
  }
}

function nameFor(el: Element, fallback: string): string {
  const attr =
    el.getAttribute("data-export-name") ||
    el.getAttribute("aria-label") ||
    el.getAttribute("alt") ||
    "";
  const clean = attr.replace(/\s+/g, " ").trim().slice(0, 60);
  return clean ? `TP ${clean}` : fallback;
}

/**
 * True when an element's paint depends on a CSS feature PowerPoint has no
 * equivalent for: filters (blur / brightness / saturate), backdrop filters
 * (frosted glass), blend modes, or a mask/clip beyond a corner radius.
 *
 * Re-emitting such an element as a native picture or shape is what produced the
 * "washed out photo, missing veil" class of parity failures: the exporter took a
 * tinted, blurred, blended photograph and shipped the RAW bytes, while
 * `neutralizeCapturedPaint` removed the styled version from the plate — so the
 * designed treatment was lost from both layers. Those elements (and their
 * descendants, which inherit the filter/blend context) stay baked into the
 * design-exact plate instead, which reproduces them pixel-for-pixel.
 */
function hasUnexpressiblePaint(cs: CSSStyleDeclaration): boolean {
  const filter = cs.filter || "none";
  const blend = cs.mixBlendMode || "normal";
  const mask =
    (cs as unknown as { maskImage?: string }).maskImage ||
    (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage ||
    "none";
  const clip = cs.clipPath || "none";
  if (filter !== "none" && filter.trim() !== "") return true;
  if (blend !== "normal") return true;
  if (mask !== "none" && mask.trim() !== "") return true;
  // inset()/round rectangles are expressible; polygons, circles and paths are not.
  if (clip !== "none" && !/^inset\(/.test(clip.trim())) return true;
  return false;
}

/**
 * Frosted glass: `backdrop-filter` blurs what is BEHIND the element, not the
 * element's own children.
 *
 * So only the element's own surface has to stay on the pixel-exact plate — the
 * icons, accent chips, rules and nested boxes sitting on top of the glass are
 * ordinary paint and remain fully editable native layers. Parking the whole
 * subtree here is what flattened every glass card in the library ("we lost the
 * full editability of our boxes in layers").
 */
function hasUnexpressibleSurface(cs: CSSStyleDeclaration): boolean {
  const backdrop = (cs as unknown as { backdropFilter?: string }).backdropFilter || "none";
  return backdrop !== "none" && backdrop.trim() !== "";
}
/**
 * Shadow recipes the native shape path cannot carry: `inset` layers (no OOXML
 * equivalent with offset + spread + tint) and stacked outer layers (only the
 * first would survive `parseBoxShadow`). Both are reproduced by the effect path.
 */
function hasUnexpressibleShadow(cs: CSSStyleDeclaration): boolean {
  const css = (cs.boxShadow || "none").trim();
  if (!css || css === "none") return false;
  const layers = css.split(/,(?![^()]*\))/).filter((p) => p.trim());
  return layers.length > 1 || layers.some((l) => /\binset\b/i.test(l));
}



/**
 * Background paint with no OOXML shape-fill equivalent: radial / conic washes
 * and stacked multi-layer gradients. These stay baked on the design plate.
 */
function hasUnexpressibleBackground(cs: CSSStyleDeclaration): boolean {
  const bg = cs.backgroundImage || "none";
  if (bg === "none" || bg.trim() === "") return false;
  if (/url\(/.test(bg)) return false; // handled as a picture
  if (/radial-gradient|conic-gradient/.test(bg)) return true;
  // Multiple stacked gradient layers: only the first would survive.
  const layers = bg.split(/,(?![^()]*\))/).filter((p) => /gradient\(/.test(p));
  return layers.length > 1;
}


/**
 * Build a picture record that reproduces an element's decorative effect exactly.
 *
 * Returns null when the element is not a pure effect layer (text host, backdrop
 * sampling filter, blend mode, no paint of its own) — the caller then falls back
 * to parking it on the pixel-exact plate.
 */
function effectShapeFor(
  el: Element,
  cs: CSSStyleDeclaration,
  root: DOMRect,
  sx: number,
  sy: number,
): DomShape | null {
  const r = el.getBoundingClientRect();
  const w = r.width * sx;
  const h = r.height * sy;
  if (w < MIN_SIDE_PX || h < MIN_SIDE_PX) return null;
  if (w > STAGE_W * 1.5 || h > STAGE_H * 1.5) return null;

  const { fill, gradient } = paintOf(cs);
  const radiusPx = radiusOf(cs, w, h);
  const ellipse =
    cs.borderRadius.includes("50%") ||
    (radiusPx >= Math.min(w, h) / 2 - 0.5 && Math.abs(w - h) < Math.max(2, w * 0.06));
  const uniformBorder = borderOf(cs);
  const borderWidthPx = uniformBorder?.widthPx ?? 0;
  const borderColor = uniformBorder ? { hex: uniformBorder.hex, alpha: uniformBorder.alpha } : null;
  const style = classifyEffectStyle(
    {
      filter: cs.filter || "none",
      maskImage:
        (cs as unknown as { maskImage?: string }).maskImage ||
        (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage ||
        "none",
      mixBlendMode: cs.mixBlendMode || "normal",
      clipPath: cs.clipPath || "none",
      opacity: parseFloat(cs.opacity),
      hasText: (el.textContent ?? "").trim().length > 0,
      fill,
      gradient,
      radiusPx,
      ellipse,
      boxShadow: cs.boxShadow || "none",
      borderWidthPx,
      borderColor,
    },
    resolveCssColor,
  );
  if (!style) return null;


  let payload: { src: string; padPx: number; frameW: number; frameH: number };
  try {
    payload = effectSvgDataUrl(style, w, h, (xml) =>
      btoa(unescape(encodeURIComponent(xml))),
    );
  } catch {
    return null;
  }

  const x = (r.left - root.left) * sx - payload.padPx;
  const y = (r.top - root.top) * sy - payload.padPx;
  if (x > STAGE_W || y > STAGE_H || x + payload.frameW < 0 || y + payload.frameH < 0) return null;

  return {
    kind: "image",
    x,
    y,
    w: payload.frameW,
    h: payload.frameH,
    radiusPx: 0,
    fill: null,
    gradient: null,
    line: null,
    shadow: null,
    src: payload.src,
    natW: payload.frameW,
    natH: payload.frameH,
    fit: "fill",
    rotationDeg: rotationOf(cs.transform),
    name: nameFor(el, "TP Effect"),
    node: el,
  };
}



/**
 * Measure every painted content object on a settled ExactSlideStage.
 *
 * Returned in DOM paint order (parents before children), which is the order the
 * placer emits them in, so PowerPoint z-order matches the browser's.
 */
export function decomposeStage(stage: HTMLElement): DomShape[] {
  const root = stage.getBoundingClientRect();
  if (root.width < 1 || root.height < 1) return [];
  const sx = STAGE_W / root.width;
  const sy = STAGE_H / root.height;
  const shapes: DomShape[] = [];

  const planes = CONTENT_PLANES.flatMap((sel) =>
    Array.from(stage.querySelectorAll<HTMLElement>(sel)),
  );
  if (planes.length === 0) return [];

  const seen = new Set<Element>();
  // Subtrees whose paint must stay on the design-exact plate (filters, blend
  // modes, non-rectangular masks). Descendants inherit that visual context, so
  // once a root is parked the whole branch is parked with it.
  const platedRoots: Element[] = [];
  // Elements whose OWN surface stays on the plate (frosted glass, radial/conic
  // and stacked-gradient washes) while their children keep exporting as native,
  // editable layers — icons, accent chips, rules, nested cards.
  const surfaceRoots: Element[] = [];
  // Decorative EFFECT layers (gauge halos, blurred blooms, feathered edges)
  // reproduced as their own transparent artwork instead of being parked on the
  // plate or approximated with a:glow. Descendants inherit the blur/mask, so the
  // subtree is owned by the effect record.
  const effectRoots: Element[] = [];
  const insidePlatedSubtree = (el: Element) =>
    platedRoots.some((root) => root === el || root.contains(el)) ||
    effectRoots.some((root) => root === el || root.contains(el));
  for (const plane of planes) {
    const all: Element[] = [plane, ...Array.from(plane.querySelectorAll("*"))];
    for (const el of all) {
      if (seen.has(el)) continue;
      seen.add(el);
      const tag = el.tagName.toUpperCase();
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "BR") continue;
      // Children of an <svg> are serialized with their root.
      if (el.closest("svg") && tag !== "SVG") continue;

      let cs: CSSStyleDeclaration;
      try {
        cs = getComputedStyle(el);
      } catch {
        continue;
      }
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const opacity = parseFloat(cs.opacity);
      if (Number.isFinite(opacity) && opacity < MIN_ALPHA) continue;
      if (insidePlatedSubtree(el)) continue;
      if (hasUnexpressiblePaint(cs)) {
        // Pure decorative effect (blur bloom, drop-shadow halo, gradient
        // feather) → ship the effect itself as a transparent picture layer so it
        // stays selectable and renders identically on light and dark slides.
        const fx = effectShapeFor(el, cs, root, sx, sy);
        if (fx) {
          shapes.push(fx);
          effectRoots.push(el);
          continue;
        }
        platedRoots.push(el);
        continue;
      }

      // Shadow recipes with no native home (inset layers, stacked elevation
      // pairs, zero-offset stroke glows). Unlike a filter, these do not alter
      // how DESCENDANTS paint, so the element ships as its own effect artwork
      // and its children keep exporting as editable native layers.
      if (hasUnexpressibleShadow(cs)) {
        const fx = effectShapeFor(el, cs, root, sx, sy);
        if (fx) {
          shapes.push(fx);
          continue;
        }
      }


      // Frosted glass: the blur only samples what is BEHIND the card, so the
      // card itself keeps exporting as a native rounded rectangle carrying its
      // own tint (the shipping contract's 90-degree linear fill, no line), and
      // its children stay editable objects. Only a glass surface whose tint is
      // itself unexpressible (radial/conic/stacked wash) falls back to the
      // pixel-exact plate, further down.
      if (hasUnexpressibleSurface(cs) && hasUnexpressibleBackground(cs)) {
        surfaceRoots.push(el);
        continue;
      }




      const r = el.getBoundingClientRect();
      const w = r.width * sx;
      const h = r.height * sy;
      if (w < MIN_SIDE_PX && h < MIN_SIDE_PX) continue;
      if (w > STAGE_W * 1.5 || h > STAGE_H * 1.5) continue;
      const x = (r.left - root.left) * sx;
      const y = (r.top - root.top) * sy;
      if (x > STAGE_W || y > STAGE_H || x + w < 0 || y + h < 0) continue;

      const rotationDeg = rotationOf(cs.transform);
      const alphaMul = Number.isFinite(opacity) ? opacity : 1;

      // ---- pictures: <img>, <svg>, <canvas> ------------------------------
      let src: string | null = null;
      let fit: "cover" | "contain" | "fill" = "cover";
      let natW = 0;
      let natH = 0;
      if (tag === "IMG") {
        const img = el as HTMLImageElement;
        src = img.currentSrc || img.src || null;
        fit = objectFitOf(cs);
        natW = img.naturalWidth || 0;
        natH = img.naturalHeight || 0;
      } else if (tag === "SVG") {
        src = svgDataUrl(el as unknown as SVGSVGElement, w, h);
        fit = "contain";
        const svg = el as unknown as SVGSVGElement;
        natW = svg.viewBox?.baseVal?.width || w;
        natH = svg.viewBox?.baseVal?.height || h;
      } else if (tag === "CANVAS") {
        try {
          src = (el as HTMLCanvasElement).toDataURL("image/png");
          fit = "fill";
          natW = (el as HTMLCanvasElement).width || 0;
          natH = (el as HTMLCanvasElement).height || 0;
        } catch {
          src = null;
        }
      }
      if (src) {
        shapes.push({
          kind: "image",
          x,
          y,
          w,
          h,
          radiusPx: radiusOf(cs, w, h),
          fill: null,
          gradient: null,
          line: null,
          shadow: parseBoxShadow(cs.boxShadow),
          src,
          natW: natW > 0 ? natW : undefined,
          natH: natH > 0 ? natH : undefined,
          fit,
          rotationDeg,
          name: nameFor(el, tag === "SVG" ? "TP Vector" : "TP Image"),
          node: el,
        });
        continue;
      }


      // EXPORT SPEC #3 — never interpret a diffuse backdrop glow as an object.
      // An aurora orb is a radial gradient behind a blur; OOXML has no mesh
      // gradient, so reconstructing it yields the hard-edged circle reported on
      // the light-mode cover. Those pixels are already on the flat backdrop
      // plate, so the object is dropped here rather than approximated.
      if (isDiffuseDecor(el, cs, w, h)) continue;

      // Paint OOXML cannot describe as a shape fill (radial / conic gradients,
      // stacked multi-layer gradients). Only that wash stays on the plate;
      // whatever is painted BEHIND it stays plated too (or a native copy would
      // land on top of the wash), while its children keep exporting natively.
      if (hasUnexpressibleBackground(cs)) {
        surfaceRoots.push(el);
        continue;
      }



      // ---- painted boxes -------------------------------------------------
      const { fill, gradient } = paintOf(cs);
      const line = borderOf(cs);
      const edges = partialEdgesOf(cs);
      const shadow = parseBoxShadow(cs.boxShadow);
      // Background-image photographs set through CSS (crops, hero fills).
      const urlMatch = (cs.backgroundImage || "").match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        shapes.push({
          kind: "image",
          x,
          y,
          w,
          h,
          radiusPx: radiusOf(cs, w, h),
          fill: null,
          gradient: null,
          line: null,
          shadow,
          src: urlMatch[1],
          fit: cs.backgroundSize === "contain" ? "contain" : "cover",
          rotationDeg,
          name: nameFor(el, "TP Image"),
          node: el,
        });
        continue;
      }
      if (!fill && !gradient && !line && edges.length === 0) continue;

      const radiusPx = radiusOf(cs, w, h);
      const isEllipse =
        cs.borderRadius.includes("50%") ||
        (radiusPx >= Math.min(w, h) / 2 - 0.5 && Math.abs(w - h) < Math.max(2, w * 0.06));

      const withAlpha = (c: DomColor | null): DomColor | null =>
        c ? { hex: c.hex, alpha: Math.max(0, Math.min(1, c.alpha * alphaMul)) } : null;

      shapes.push({
        kind: isEllipse ? "ellipse" : radiusPx >= 1 ? "roundRect" : "rect",
        x,
        y,
        w,
        h,
        radiusPx,
        fill: withAlpha(fill),
        gradient: gradient
          ? {
              angleDeg: gradient.angleDeg,
              stops: gradient.stops.map((s) => ({
                pos: s.pos,
                color: withAlpha(s.color) as DomColor,
              })),
            }
          : null,
        line: line ? { ...line, alpha: line.alpha * alphaMul } : null,
        shadow,
        rotationDeg,
        name: nameFor(el, "TP Shape"),
        node: el,
      });

      // Accent edges become their own hairline bars so a one-sided CSS rule
      // never widens into a full outline in PowerPoint.
      for (const e of edges) {
        const t = Math.max(1, e.widthPx);
        const bar =
          e.side === "left"
            ? { x, y, w: t, h }
            : e.side === "right"
              ? { x: x + w - t, y, w: t, h }
              : e.side === "top"
                ? { x, y, w, h: t }
                : { x, y: y + h - t, w, h: t };
        shapes.push({
          kind: "rect",
          ...bar,
          radiusPx: 0,
          fill: withAlpha(e.color),
          gradient: null,
          line: null,
          shadow: null,
          rotationDeg,
          name: nameFor(el, "TP Rule"),
          node: el,
        });
      }
    }
  }
  PLATED_ROOTS.set(stage, platedRoots);
  SURFACE_ROOTS.set(stage, surfaceRoots);
  return shapes;
}

/**
 * Subtrees the last `decomposeStage(stage)` decided to leave on the raster plate
 * (filters, blend modes, non-rectangular masks) — paint AND children.
 */
const PLATED_ROOTS = new WeakMap<HTMLElement, Element[]>();
export function platedPaintRoots(stage: HTMLElement): Element[] {
  return PLATED_ROOTS.get(stage) ?? [];
}

/**
 * Elements whose own surface stayed on the plate (frosted glass, radial/conic
 * and stacked-gradient washes) while their children exported as native layers.
 */
const SURFACE_ROOTS = new WeakMap<HTMLElement, Element[]>();
export function surfacePaintRoots(stage: HTMLElement): Element[] {
  return SURFACE_ROOTS.get(stage) ?? [];
}

/** True when a box carries any visible paint of its own. */
function paintsAnything(s: DomShape): boolean {
  const VISIBLE = 0.02;
  if (s.fill && s.fill.alpha >= VISIBLE) return true;
  if (s.gradient && s.gradient.stops.some((st) => st.color.alpha >= VISIBLE)) return true;
  return false;
}

function overlaps(a: Element, b: Element): boolean {
  try {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return ra.left < rb.right && rb.left < ra.right && ra.top < rb.bottom && rb.top < ra.bottom;
  } catch {
    return true;
  }
}

/**
 * Drop native boxes that would paint OVER content we deliberately left on the
 * design plate.
 *
 * A full-bleed photograph that could not be inlined (or a frosted subtree we
 * parked) stays baked in the plate — correct, because the plate is pixel-exact.
 * But its ANCESTOR container is often an opaque brand-navy rectangle, and
 * emitting that natively on top of the plate erases the photo in PowerPoint
 * (the "quote slide lost its city skyline" defect). Those ancestors are already
 * painted correctly on the plate, so they must not be re-emitted.
 *
 * `surfaceOnPlate` roots are pruned more narrowly: only the ancestors and the
 * earlier-painted boxes that actually OVERLAP the glass/wash are dropped, so
 * cards, icons and accent chips elsewhere on the slide stay editable objects.
 */
export function pruneOccludingPaint(
  shapes: DomShape[],
  onPlate: Element[],
  surfaceOnPlate: Element[] = [],
): DomShape[] {
  if (onPlate.length === 0 && surfaceOnPlate.length === 0) return shapes;
  return shapes.filter((s) => {
    if (s.kind === "image") return true;
    if (!paintsAnything(s)) return true;
    const el = s.node as Element | undefined;
    if (!el) return true;
    // Anything painted BEHIND plated content (ancestors, earlier siblings and
    // their subtrees) is already baked into the pixel-exact plate. Re-emitting
    // it natively lands it on TOP of the plate and veils/erases the photo.
    const behind = (p: Element) => {
      if (p === el || el.contains(p)) return true;
      const rel = el.compareDocumentPosition(p);
      // p FOLLOWS el in document order → el paints first → el is behind p.
      return (rel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    };
    if (onPlate.some(behind)) return false;
    return !surfaceOnPlate.some((p) => behind(p) && overlaps(el, p));
  });
}


/**
 * Take the captured paint OFF the plate without touching layout.
 *
 * Every object we re-emitted natively must not also be baked into the raster,
 * or the export double-paints it and the "native" copy is invisible. Rather than
 * hiding the whole content plane (which would strand anything the decomposer
 * could not express — filters, masks, radial washes), we neutralise exactly the
 * paint we took: backgrounds, borders and elevation on boxes, and the pixels of
 * pictures. Children stay visible, so unmeasured artwork still lands on the
 * plate and the slide is never missing a designed element.
 */
export function neutralizeCapturedPaint(shapes: DomShape[]): void {
  for (const s of shapes) {
    const el = s.node as HTMLElement | undefined;
    if (!el || !el.style) continue;
    if (s.kind === "image") {
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("background-image", "none", "important");
      continue;
    }
    // The native copy carries this box's tint, so the plate must not keep the
    // frosted panel underneath it (that duplicate is what darkened glass cards).
    el.style.setProperty("backdrop-filter", "none", "important");
    el.style.setProperty("-webkit-backdrop-filter", "none", "important");
    el.style.setProperty("background", "none", "important");
    el.style.setProperty("background-color", "transparent", "important");
    el.style.setProperty("background-image", "none", "important");
    el.style.setProperty("border-color", "transparent", "important");
    el.style.setProperty("box-shadow", "none", "important");
  }
}

/**
 * Resolve every picture record to an inline data URL, and DROP the records that
 * cannot be resolved.
 *
 * This is what keeps the export lossless. `neutralizeCapturedPaint` is driven by
 * the same array, so a picture we could not inline stays on the raster plate
 * instead of being erased from the plate AND missing as an object — the failure
 * mode that turned a highlighted column header into an empty black chip.
 *
 * SVG is rasterized to PNG here (at 2x, alpha preserved): PowerPoint, Keynote
 * and Google Slides all treat inline SVG differently, and a vector that renders
 * in one and vanishes in another is not parity.
 */
export async function resolveShapeImages(
  shapes: DomShape[],
  /** Receives the nodes whose pixels stay on the plate because they could not embed. */
  dropped?: Element[],
): Promise<DomShape[]> {
  const out: DomShape[] = [];
  const cache = new Map<string, string | null>();
  for (const s of shapes) {
    if (s.kind !== "image") {
      out.push(s);
      continue;
    }
    const src = s.src ?? "";
    const note = () => {
      if (dropped && s.node) dropped.push(s.node as Element);
    };
    if (!src) {
      note();
      continue;
    }
    let resolved = cache.get(src);
    if (resolved === undefined) {
      resolved = await inlineImage(src, s.w, s.h);
      cache.set(src, resolved);
    }
    if (!resolved) {
      note();
      continue;
    }
    out.push({ ...s, src: resolved });
  }
  return out;
}

async function inlineImage(src: string, w: number, h: number): Promise<string | null> {
  try {
    if (src.startsWith("data:image/svg+xml")) return await svgToPng(src, w, h);
    if (src.startsWith("data:")) return src;
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    if (dataUrl.startsWith("data:image/svg+xml")) return await svgToPng(dataUrl, w, h);
    return dataUrl;
  } catch {
    return null;
  }
}

async function svgToPng(dataUrl: string, w: number, h: number): Promise<string | null> {
  try {
    const img = new Image();
    img.decoding = "sync";
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = dataUrl;
    if (!(await loaded)) return null;
    const scale = 2;
    const cw = Math.max(2, Math.round(Math.max(w, 8) * scale));
    const ch = Math.max(2, Math.round(Math.max(h, 8) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
