// -----------------------------------------------------------------------------
// PPTX icon glyphs
//
// PowerPoint scales an embedded SVG's geometry AND its stroke together, so a
// Lucide glyph authored at 24px/stroke-2 lands visually 2-3x too heavy when it
// is drawn into a 0.3in cell badge, and far too thin inside a large hero disc.
// This module renders the same component the on-screen renderer picks, but with
// the stroke width renormalized for the *drawn* box so the outline weight is
// proportionate at every size (constant ~1.1-1.9pt on the printed slide).
// -----------------------------------------------------------------------------

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { pickIcon } from "@/components/slide/VariantRenderer";

/** Target outline weight on the slide, in points, for a given box size. */
const MIN_STROKE_PT = 1.05;
const MAX_STROKE_PT = 1.9;
/** Fraction of the icon box that reads as a balanced outline (matches screen). */
const STROKE_RATIO = 0.055;

const cache = new Map<string, string | null>();

function toDataUrl(svg: string): string {
  const withNs = svg.includes("xmlns=")
    ? svg
    : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(withNs)))}`;
}

/**
 * Stroke width, in the icon's own 24-unit coordinate space, that renders as a
 * proportionate outline once the glyph is scaled to `boxIn` inches.
 */
export function proportionalStrokeWidth(boxIn: number): number {
  const boxPt = Math.max(0.01, boxIn) * 72;
  const targetPt = Math.min(MAX_STROKE_PT, Math.max(MIN_STROKE_PT, boxPt * STROKE_RATIO));
  return Number(((24 * targetPt) / boxPt).toFixed(3));
}

/**
 * Resolve a glyph for `label`/`override` and return an SVG data URL sized for a
 * `boxIn`-inch square. Returns null when nothing can be rendered (the caller
 * then falls back to its shape-only treatment).
 */
export function iconGlyphDataUrl(
  label: string,
  opts: { index?: number; override?: string | null; color: string; boxIn: number },
): string | null {
  const { index = 0, override, color, boxIn } = opts;
  const strokeWidth = proportionalStrokeWidth(boxIn);
  const key = `${override ?? ""}|${label}|${index}|${color}|${strokeWidth}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  let out: string | null = null;
  try {
    const Icon = pickIcon(label, index, override);
    const markup = renderToStaticMarkup(
      createElement(Icon as never, {
        size: 24,
        color: color.startsWith("#") ? color : `#${color}`,
        strokeWidth,
      }),
    );
    // Custom icon packs render nested markup rather than a bare <svg>; only
    // ship real single-root SVGs to PowerPoint.
    out = /^<svg[\s>]/i.test(markup.trim()) ? toDataUrl(markup) : null;
  } catch (e) {
    console.warn("[pptx-icons] glyph render failed", label, override, e);
    out = null;
  }
  cache.set(key, out);
  return out;
}
