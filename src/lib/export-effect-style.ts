// -----------------------------------------------------------------------------
// Effect-style export path (gauge halos, feathered edges, soft blooms)
//
// PowerPoint has no `filter: blur()`, no gradient mask and no additive bloom.
// Two lossy routes were being taken before this module existed:
//
//   1. approximate the halo with `a:glow` / `a:outerShdw` — the arc end-caps grew
//      a hard-edged ring, and the same CSS produced a DIFFERENT halo on light vs
//      dark slides because the stand-in alpha was mode-tuned, not measured;
//   2. park the whole subtree on the pixel-exact raster plate — correct pixels,
//      but the halo became part of the background and the gauge lost editability.
//
// The effect path takes a third route: reproduce the effect EXACTLY once, as a
// standalone transparent SVG (real `feGaussianBlur`, real gradient mask), sized
// with bleed padding so the blur is not clipped. The decomposer emits it as its
// own picture object, so it stays a selectable, movable, deletable layer, and
// because every colour is read from the live computed cascade the light and dark
// variants ship identical geometry with their own measured paint.
//
// Everything here is pure so the classification can be unit-tested without a DOM.
// -----------------------------------------------------------------------------

import type { DomColor, DomGradient, DomShadow } from "./export-dom-decompose";

export interface EffectShadow extends DomShadow {
  /** CSS dx/dy in px (SVG needs the cartesian pair, not the polar form). */
  dx: number;
  dy: number;
  /** CSS box-shadow spread radius in px (0 for filter drop-shadows). */
  spreadPx: number;
}

/** `box-shadow: inset ...` — PowerPoint's `a:innerShdw` cannot offset+spread+tint. */
export interface EffectInsetShadow extends EffectShadow {
  inset: true;
}

/** A visible border, optionally blooming outward (`stroke glow`). */
export interface EffectStroke {
  widthPx: number;
  color: DomColor;
}

export interface EffectFeather {
  kind: "linear" | "radial";
  /** CSS gradient angle (linear only): 0 = to top, 90 = to right. */
  angleDeg: number;
  /** Alpha ramp, 0-100 position → 0-1 opacity. */
  stops: Array<{ pos: number; opacity: number }>;
}

export interface EffectStyle {
  /** CSS `filter: blur(Npx)` radius (0 = none). */
  blurPx: number;
  /** `filter: drop-shadow(...)` + outer `box-shadow` layers, outermost first. */
  shadows: EffectShadow[];
  /** `box-shadow: inset ...` layers, painted inside the shape. */
  insetShadows: EffectInsetShadow[];
  /** Border paint kept as a real SVG stroke so the ring edge stays crisp. */
  stroke: EffectStroke | null;
  /** Blurred, zero-offset halos radiating from the stroke/shape edge. */
  strokeGlows: EffectShadow[];
  /** Gradient mask feathering the element into the slide (null = hard edges). */
  feather: EffectFeather | null;
  fill: DomColor | null;
  gradient: DomGradient | null;
  radiusPx: number;
  ellipse: boolean;
  opacity: number;
}

export interface EffectCandidate {
  filter: string;
  maskImage: string;
  mixBlendMode: string;
  clipPath: string;
  opacity: number;
  /** True when the element paints live text (never routed through this path). */
  hasText: boolean;
  fill: DomColor | null;
  gradient: DomGradient | null;
  radiusPx: number;
  ellipse: boolean;
  /** Raw computed `box-shadow` (inset and outer layers alike). */
  boxShadow?: string;
  /** Uniform border width in px (0 when the element has no visible border). */
  borderWidthPx?: number;
  /** Resolved border colour, when a border is painted. */
  borderColor?: DomColor | null;
}


/** Filter functions whose result depends on pixels BEHIND the element. */
const BACKDROP_DEPENDENT = /\b(brightness|contrast|saturate|grayscale|sepia|hue-rotate|invert)\s*\(/i;

function num(v: string | undefined): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

/** `blur(18px)` → 18. Only the first blur layer is meaningful in CSS. */
export function parseFilterBlur(filter: string): number {
  const m = /blur\(\s*(-?[\d.]+)px\s*\)/i.exec(filter || "");
  return m ? Math.max(0, num(m[1])) : 0;
}

/** `drop-shadow(0 8px 24px rgba(...))` layers, in author order. */
export function parseDropShadows(
  filter: string,
  resolveColor: (css: string) => DomColor | null,
): EffectShadow[] {
  const out: EffectShadow[] = [];
  const re = /drop-shadow\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(filter || ""))) {
    const body = m[1];
    const colorText = (body.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/i) ?? [])[0] ?? "";
    const color = resolveColor(colorText) ?? { hex: "000000", alpha: 0.35 };
    const nums = [...body.matchAll(/(-?[\d.]+)px/g)].map((n) => parseFloat(n[1]));
    const [dx = 0, dy = 0, blur = 0] = nums;
    out.push({
      dx,
      dy,
      blurPx: Math.max(0, blur),
      spreadPx: 0,
      offsetPx: Math.hypot(dx, dy),
      angleDeg: ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
      color,
    });
  }
  return out;
}

/** Split a comma list without breaking inside `rgba(...)`. */
function splitLayers(css: string): string[] {
  return (css || "")
    .split(/,(?![^()]*\))/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Every `box-shadow` layer, outer and inset alike.
 *
 * The native path can express ONE outer shadow, so a stacked `box-shadow`
 * (a tight contact shadow plus a wide ambient bloom, the library's standard
 * elevation recipe) lost every layer but the first. Inset layers had no native
 * home at all. Both are reproduced here.
 */
export function parseBoxShadowLayers(
  css: string | undefined | null,
  resolveColor: (s: string) => DomColor | null,
): { outer: EffectShadow[]; inset: EffectInsetShadow[] } {
  const outer: EffectShadow[] = [];
  const inset: EffectInsetShadow[] = [];
  const raw = (css || "").trim();
  if (!raw || raw === "none") return { outer, inset };
  for (const layer of splitLayers(raw)) {
    const isInset = /\binset\b/i.test(layer);
    const colorText = (layer.match(/(rgba?\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]{3,8})/i) ?? [])[0] ?? "";
    const color = resolveColor(colorText);
    const nums = [...layer.matchAll(/(-?[\d.]+)px/g)].map((n) => parseFloat(n[1]));
    if (!color || color.alpha <= 0 || nums.length < 2) continue;
    const [dx = 0, dy = 0, blur = 0, spread = 0] = nums;
    const shadow: EffectShadow = {
      dx,
      dy,
      blurPx: Math.max(0, blur),
      spreadPx: spread,
      offsetPx: Math.hypot(dx, dy),
      angleDeg: ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360,
      color,
    };
    if (isInset) inset.push({ ...shadow, inset: true });
    else outer.push(shadow);
  }
  return { outer, inset };
}

/**
 * A stroke glow is an outer shadow with no offset: the halo radiates evenly from
 * the shape edge (`0 0 24px rgba(accent)`), which `a:outerShdw` cannot do and
 * `a:glow` only approximates with a single hard-edged ring.
 */
export function isStrokeGlow(s: EffectShadow): boolean {
  return Math.abs(s.dx) < 0.5 && Math.abs(s.dy) < 0.5 && (s.blurPx > 0 || s.spreadPx > 0);
}


/** A `mask-image` gradient describing a feathered edge. */
export function parseFeather(
  maskImage: string,
  resolveColor: (css: string) => DomColor | null,
): EffectFeather | null {
  const mask = (maskImage || "").trim();
  if (!mask || mask === "none") return null;
  const isRadial = /radial-gradient\(/i.test(mask);
  const isLinear = /linear-gradient\(/i.test(mask);
  if (!isRadial && !isLinear) return null;
  const open = mask.indexOf("(");
  const close = mask.lastIndexOf(")");
  if (open < 0 || close <= open) return null;
  const args = mask
    .slice(open + 1, close)
    .split(/,(?![^()]*\))/)
    .map((p) => p.trim())
    .filter(Boolean);
  let angleDeg = 180;
  let first = 0;
  const head = (args[0] ?? "").toLowerCase();
  const deg = head.match(/^(-?[\d.]+)deg$/);
  if (deg) {
    angleDeg = ((num(deg[1]) % 360) + 360) % 360;
    first = 1;
  } else if (head.startsWith("to ") || /^(circle|ellipse|at |closest|farthest)/.test(head)) {
    first = 1;
  }
  const raw = args.slice(first);
  const stops: EffectFeather["stops"] = [];
  raw.forEach((part, i) => {
    const pct = part.match(/(-?[\d.]+)%\s*$/);
    const colorText = pct ? part.slice(0, pct.index).trim() : part.trim();
    const c = resolveColor(colorText);
    // A mask reads luminance*alpha; brand masks are black/transparent ramps, so
    // alpha alone is the ramp. `transparent` resolves to null → fully clipped.
    const opacity = c ? Math.max(0, Math.min(1, c.alpha)) : 0;
    const pos = pct
      ? Math.max(0, Math.min(100, num(pct[1])))
      : raw.length === 1
        ? 0
        : (i / (raw.length - 1)) * 100;
    stops.push({ pos, opacity });
  });
  if (stops.length < 2) return null;
  stops.sort((a, b) => a.pos - b.pos);
  return { kind: isRadial ? "radial" : "linear", angleDeg, stops };
}

/**
 * Decide whether an element is a pure decorative EFFECT this path can reproduce
 * losslessly (blur bloom, drop-shadow halo, gradient feather over its own paint).
 *
 * Returns null for anything that must keep its existing treatment: text hosts,
 * backdrop-dependent filters (brightness/saturate sample what is behind), blend
 * modes, non-rectangular clips, and elements with no paint of their own.
 */
export function classifyEffectStyle(
  c: EffectCandidate,
  resolveColor: (css: string) => DomColor | null,
): EffectStyle | null {
  if (c.hasText) return null;
  if ((c.mixBlendMode || "normal") !== "normal") return null;
  const clip = (c.clipPath || "none").trim();
  if (clip !== "none" && !/^inset\(/.test(clip)) return null;

  const filter = (c.filter || "none").trim();
  const hasFilter = filter !== "" && filter !== "none";
  if (hasFilter && BACKDROP_DEPENDENT.test(filter)) return null;

  const blurPx = hasFilter ? parseFilterBlur(filter) : 0;
  const shadows = hasFilter ? parseDropShadows(filter, resolveColor) : [];
  const feather = parseFeather(c.maskImage, resolveColor);
  if (blurPx <= 0 && shadows.length === 0 && !feather) return null;
  // Only the effect layer itself — an effect over no paint has nothing to draw.
  if (!c.fill && !c.gradient) return null;

  return {
    blurPx,
    shadows,
    feather,
    fill: c.fill,
    gradient: c.gradient,
    radiusPx: Math.max(0, c.radiusPx),
    ellipse: c.ellipse,
    opacity: Number.isFinite(c.opacity) ? Math.max(0, Math.min(1, c.opacity)) : 1,
  };
}

/** Extra room the blur/shadow bleeds outside the element box, in px. */
export function effectPadPx(style: EffectStyle): number {
  const shadowReach = style.shadows.reduce(
    (m, s) => Math.max(m, s.blurPx * 1.5 + Math.abs(s.dx) + Math.abs(s.dy)),
    0,
  );
  // CSS blur(N) reaches ~3σ where σ = N/2 → ~1.5N of visible bleed.
  return Math.ceil(Math.max(style.blurPx * 1.6, shadowReach));
}

function rgba(c: DomColor, mul = 1): string {
  const a = Math.max(0, Math.min(1, c.alpha * mul));
  if (a >= 1) return `#${c.hex}`;
  const ch = (i: number) => parseInt(c.hex.slice(i, i + 2), 16);
  return `rgba(${ch(0)},${ch(2)},${ch(4)},${Math.round(a * 1000) / 1000})`;
}


/** CSS gradient angle → SVG x1/y1/x2/y2 on the unit square. */
function linearVector(angleDeg: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return {
    x1: 0.5 - dx / 2,
    y1: 0.5 - dy / 2,
    x2: 0.5 + dx / 2,
    y2: 0.5 + dy / 2,
  };
}

/**
 * Build a standalone transparent SVG that reproduces the effect exactly.
 *
 * The returned frame is the element box grown by `padPx` on every side, in the
 * same coordinate space the caller measured — the decomposer offsets the picture
 * record by it so the bloom lands where the browser painted it.
 */
export function effectSvg(
  style: EffectStyle,
  w: number,
  h: number,
): { svg: string; padPx: number; frameW: number; frameH: number } {
  const pad = effectPadPx(style);
  const fw = Math.max(1, Math.round(w + pad * 2));
  const fh = Math.max(1, Math.round(h + pad * 2));
  const bw = Math.max(1, Math.round(w));
  const bh = Math.max(1, Math.round(h));

  const defs: string[] = [];
  const fills =
    style.gradient && style.gradient.stops.length >= 2
      ? (() => {
          const v = linearVector(style.gradient.angleDeg);
          defs.push(
            `<linearGradient id="g" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}">` +
              style.gradient.stops
                .map(
                  (s) =>
                    `<stop offset="${Math.round(s.pos * 100) / 10000}" stop-color="#${
                      s.color.hex
                    }" stop-opacity="${Math.round(s.color.alpha * 1000) / 1000}"/>`,
                )
                .join("") +
              `</linearGradient>`,
          );
          return "url(#g)";
        })()
      : style.fill
        ? rgba(style.fill)
        : "none";

  if (style.feather) {
    const f = style.feather;
    const ramp = f.stops
      .map(
        (s) =>
          `<stop offset="${Math.round(s.pos * 100) / 10000}" stop-color="#FFFFFF" stop-opacity="${
            Math.round(s.opacity * 1000) / 1000
          }"/>`,
      )
      .join("");
    if (f.kind === "radial") {
      defs.push(`<radialGradient id="fg" cx="0.5" cy="0.5" r="0.5">${ramp}</radialGradient>`);
    } else {
      const v = linearVector(f.angleDeg);
      defs.push(
        `<linearGradient id="fg" x1="${v.x1}" y1="${v.y1}" x2="${v.x2}" y2="${v.y2}">${ramp}</linearGradient>`,
      );
    }
    defs.push(
      `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${fw}" height="${fh}">` +
        `<rect x="${pad}" y="${pad}" width="${bw}" height="${bh}" fill="url(#fg)"/></mask>`,
    );
  }

  const filterParts: string[] = [];
  // Shadows first so the blur (applied to the shape) does not smear them twice.
  for (const s of style.shadows) {
    filterParts.push(
      `<feDropShadow dx="${s.dx}" dy="${s.dy}" stdDeviation="${
        Math.round((s.blurPx / 2) * 100) / 100
      }" flood-color="#${s.color.hex}" flood-opacity="${
        Math.round(s.color.alpha * 1000) / 1000
      }"/>`,
    );
  }
  if (style.blurPx > 0) {
    filterParts.unshift(
      `<feGaussianBlur stdDeviation="${Math.round((style.blurPx / 2) * 100) / 100}"/>`,
    );
  }
  if (filterParts.length) {
    defs.push(
      `<filter id="fx" x="-50%" y="-50%" width="200%" height="200%" ` +
        `color-interpolation-filters="sRGB">${filterParts.join("")}</filter>`,
    );
  }

  const shape = style.ellipse
    ? `<ellipse cx="${pad + bw / 2}" cy="${pad + bh / 2}" rx="${bw / 2}" ry="${bh / 2}" fill="${fills}"/>`
    : `<rect x="${pad}" y="${pad}" width="${bw}" height="${bh}" rx="${
        Math.round(Math.min(style.radiusPx, Math.min(bw, bh) / 2) * 100) / 100
      }" fill="${fills}"/>`;

  const attrs = [
    filterParts.length ? `filter="url(#fx)"` : "",
    style.feather ? `mask="url(#m)"` : "",
    style.opacity < 1 ? `opacity="${Math.round(style.opacity * 1000) / 1000}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" ` +
    `viewBox="0 0 ${fw} ${fh}">` +
    (defs.length ? `<defs>${defs.join("")}</defs>` : "") +
    `<g ${attrs}>${shape}</g>` +
    `</svg>`;

  return { svg, padPx: pad, frameW: fw, frameH: fh };
}

/** Base64 data URL of `effectSvg` — what the decomposer ships as the picture. */
export function effectSvgDataUrl(
  style: EffectStyle,
  w: number,
  h: number,
  encode: (xml: string) => string,
): { src: string; padPx: number; frameW: number; frameH: number } {
  const { svg, padPx, frameW, frameH } = effectSvg(style, w, h);
  return { src: `data:image/svg+xml;base64,${encode(svg)}`, padPx, frameW, frameH };
}
