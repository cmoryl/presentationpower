// DOM collector for the brand-health pre-flight.
//
// Reads what a rendered slide or social layout actually paints — resolved text
// colour, the surface behind it, family, size, weight — and hands plain samples
// to `scoreBrandHealth`. Nothing here draws, injects or replaces a background:
// it only measures the surface the layout already has.
//
// Browser-only (uses getComputedStyle); call it from an effect or a handler.

import type { BrandGuide } from "./brand-guides";
import { MASTER_TRANSPERFECT_GUIDE } from "./brand-guides";
import {
  scoreBrandHealth,
  type BrandHealthReport,
  type BrandHealthSample,
} from "./brand-health";
import type {
  LogoBox,
  LogoGround,
  LogoMedium,
  LogoPlacementInput,
  LogoTone,
  MatrixOrientation,
} from "./logo-placement-matrix";

// Chrome, guides and decorative type are never scored. `aria-hidden` is NOT a
// skip: a decorative <svg aria-hidden="true"> often carries the visible
// headline, and icons have no text of their own to score anyway.
const SKIP_SELECTOR =
  "[data-decorative],[data-accent-glow],[data-ui-chrome],[data-export-ignore='true'],[data-brand-health-ignore]";

/** Surfaces that mean "this text sits on photography or a curated plate". */
const MEDIA_SELECTOR = "[data-on-media],[data-media-backing],[data-chrome-on-media],[data-on-fill]";

function toHex(color: string): string {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return /^#[0-9a-f]{3,8}$/i.test(color.trim()) ? color.trim().toLowerCase() : "";
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  const [r, g, b] = parts;
  if ([r, g, b].some((n) => Number.isNaN(n))) return "";
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function alphaOf(color: string): number {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return 1;
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  return parts.length > 3 ? (Number.isNaN(parts[3]) ? 1 : parts[3]) : 1;
}

/** Composite a translucent foreground over its surface so the ratio is honest. */
function flatten(fg: string, bg: string): string {
  const a = alphaOf(fg);
  const f = toHex(fg);
  const b = toHex(bg);
  if (!f || !b || a >= 0.999) return f;
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const mix = (i: number) => Math.round(n(f, i) * a + n(b, i) * (1 - a));
  const h = (v: number) => v.toString(16).padStart(2, "0");
  return `#${h(mix(0))}${h(mix(1))}${h(mix(2))}`;
}

type Surface = { bg: string; onMedia: boolean };

/** First colour stop declared in a CSS gradient, so gradient grounds measure honestly. */
function gradientStop(backgroundImage: string): string {
  const stop = backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/i);
  return stop ? toHex(stop[0]) : "";
}

/**
 * Walk ancestors for the first opaque-enough background. A photograph counts as
 * media: its pixel colour is unknowable from CSS, so the sample falls back to
 * the slide mode's own ground and is flagged as on-media. Gradient grounds are
 * measured against their first declared stop.
 */
function surfaceFor(el: Element, root: HTMLElement): Surface {
  let cur: Element | null = el;
  let onMedia = Boolean(el.closest(MEDIA_SELECTOR));
  while (cur) {
    const cs = getComputedStyle(cur);
    const image = cs.backgroundImage;
    if (image && image !== "none") {
      if (/url\(/i.test(image)) onMedia = true;
      const stop = gradientStop(image);
      if (stop) return { bg: stop, onMedia };
    }
    const a = alphaOf(cs.backgroundColor);
    if (a > 0.85) return { bg: toHex(cs.backgroundColor) || "#ffffff", onMedia };
    if (cur === root) break;
    cur = cur.parentElement;
  }
  const mode = el.closest("[data-slide-mode]") as HTMLElement | null;
  return { bg: mode?.dataset.slideMode === "dark" ? "#03002c" : "#ffffff", onMedia };
}

/** Collect every scorable run of text inside one rendered surface. */
export function collectBrandHealthSamples(root: HTMLElement, prefix = "s"): BrandHealthSample[] {
  const out: BrandHealthSample[] = [];
  let n = 0;
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const ownText = Array.from(el.childNodes).some(
      (node) => node.nodeType === 3 && (node.textContent ?? "").trim().length > 0,
    );
    if (!ownText) return;
    if (el.closest(SKIP_SELECTOR)) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return;
    if (parseFloat(cs.opacity || "1") < 0.15) return;
    const stroke = parseFloat(cs.getPropertyValue("-webkit-text-stroke-width") || "0");
    if (stroke > 0) return;
    // SVG text paints with `fill`; HTML text with `color`.
    const isSvgText = el instanceof SVGElement;
    const fill = isSvgText
      ? cs.fill || cs.color
      : cs.getPropertyValue("-webkit-text-fill-color") || cs.color;
    // A gradient or pattern paint has no single measurable colour. Keep the run
    // so the typeface and scale checks still see it, and say nothing about its
    // contrast rather than guessing a colour.
    const unmeasurablePaint = /url\(/i.test(fill);
    if (!unmeasurablePaint && alphaOf(fill) < 0.1) return;

    const { bg, onMedia } = surfaceFor(el, root);
    const fg = unmeasurablePaint ? "" : flatten(fill, bg);
    if (!unmeasurablePaint && !fg) return;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const fontSizePx = parseFloat(cs.fontSize) || 16;
    n += 1;
    out.push({
      id: `${prefix}-${n}`,
      label: `${el.dataset.brandHealthLabel ?? el.tagName.toLowerCase()} · ${text.slice(0, 32)}`,
      text,
      fg,
      bg,
      fontFamily: cs.fontFamily,
      fontSizePx,
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      onMedia,
    });
  });
  return out;
}

/**
 * Collect every brand lockup rendered inside one surface, with the box it
 * occupies, the ground behind it and everything near enough to intrude on its
 * clear space. Measuring only — no background is drawn or replaced.
 */
export function collectLogoPlacements(
  root: HTMLElement,
  medium: LogoMedium = "slide",
  prefix = "s",
): LogoPlacementInput[] {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width < 1 || rootRect.height < 1) return [];
  const rel = (r: DOMRect): LogoBox => ({
    x: r.left - rootRect.left,
    y: r.top - rootRect.top,
    w: r.width,
    h: r.height,
  });

  const lockups = Array.from(root.querySelectorAll<HTMLElement>("[data-brand-lockup]")).filter(
    (el) => {
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetWidth > 0;
    },
  );
  if (!lockups.length) return [];

  // Anything painted on the surface that could crowd a lockup: runs of text and
  // media tiles. Elements inside a lockup are excluded.
  const others: Array<LogoBox & { label?: string }> = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.closest("[data-brand-lockup]")) return;
    if (el.closest(SKIP_SELECTOR)) return;
    const isMedia = el.matches("[data-media-tile],[data-logo-tile]");
    const ownText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0,
    );
    if (!ownText && !isMedia) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    others.push({
      ...rel(r),
      label: ownText ? `“${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 28)}”` : "Media",
    });
  });

  return lockups.map((el, i) => {
    const box = rel(el.getBoundingClientRect());
    const { bg, onMedia } = surfaceFor(el, root);
    const curated = Boolean(el.closest("[data-curated-image]"));
    const ground: LogoGround = onMedia
      ? {
          kind: curated ? "image" : "photo",
          hex: bg || undefined,
          scrim: Boolean(el.closest("[data-scrim],[data-media-backing],[data-chrome-on-media]")),
        }
      : { kind: "solid-token", hex: bg || "#ffffff" };
    const orientation = (el.dataset.lockupOrientation as MatrixOrientation) || "horizontal";
    const tone = (el.dataset.lockupTone as LogoTone) || "color";
    return {
      id: `${prefix}-logo-${i + 1}`,
      label: `${prefix} · brand lockup`,
      medium,
      surface: { w: rootRect.width, h: rootRect.height },
      box,
      ground,
      orientation,
      tone,
      // Only neighbours that actually reach the safe zone matter; the matrix
      // does the geometry, so pass everything measured on the surface.
      neighbours: others,
    } satisfies LogoPlacementInput;
  });
}

/**
 * Scan one or more rendered surfaces and score them.
 *
 * `roots` are the rendered stages — `[data-slide-stage]` for slides, the board
 * element for a social layout.
 */
export function scanBrandHealth(
  roots: HTMLElement[],
  guide: BrandGuide = MASTER_TRANSPERFECT_GUIDE,
  labels?: string[],
  medium: LogoMedium = "slide",
): BrandHealthReport {
  const samples: BrandHealthSample[] = [];
  const logos: LogoPlacementInput[] = [];
  roots.forEach((root, i) => {
    const prefix = labels?.[i] ?? `Item ${String(i + 1).padStart(2, "0")}`;
    for (const s of collectBrandHealthSamples(root, prefix)) {
      samples.push({ ...s, label: `${prefix} · ${s.text.slice(0, 40)}` });
    }
    logos.push(...collectLogoPlacements(root, medium, prefix));
  });
  return scoreBrandHealth(samples, guide, logos);
}
