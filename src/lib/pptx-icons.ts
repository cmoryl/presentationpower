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
import { parseIconRef } from "@/lib/icon-library";
import { getLoadedPack, iconSvgMarkup, loadPack, resolveIcon } from "@/lib/icon-packs";

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
 * Icon-pack glyphs, resolved SYNCHRONOUSLY off the in-memory pack cache.
 *
 * `IconRenderer` (the on-screen path) loads its pack in an effect, so rendering
 * that component to static markup — which is what the exporter does — returns
 * the component's grey placeholder <span> instead of an <svg>, and every
 * pack-referenced icon used to be dropped. Reading the cached pack directly and
 * building the markup with `iconSvgMarkup` gives the exporter the real glyph
 * (with the pack's own viewBox), provided the pack has been warmed first.
 */
function packGlyphMarkup(
  override: string | null | undefined,
  color: string,
  strokeWidth: number,
): string | null {
  const ref = parseIconRef(override ?? null);
  if (!ref) return null;
  const pack = getLoadedPack(ref.packId);
  if (!pack) return null;
  const icon = resolveIcon(pack, ref.name);
  if (!icon) return null;
  const svg = iconSvgMarkup(pack, icon, {
    size: 24,
    color: color.startsWith("#") ? color : `#${color}`,
  });
  // Outline packs inherit stroke width from the host; normalise it like Lucide.
  return svg.replace("<svg", `<svg stroke-width="${strokeWidth}"`);
}

/**
 * Preload the icon packs a deck references so `iconGlyphDataUrl` can resolve
 * them synchronously during the render pass. Failures are ignored — a pack that
 * will not load simply falls back to the label-derived Lucide glyph.
 */
export async function warmIconPacks(refs: Iterable<string | null | undefined>): Promise<void> {
  const ids = new Set<string>();
  for (const ref of refs) {
    const parsed = parseIconRef(ref ?? null);
    if (parsed) ids.add(parsed.packId);
  }
  await Promise.all([...ids].map((id) => loadPack(id).catch(() => null)));
}

/** Elements that can only be SVG content — never HTML placeholder markup. */
const SVG_FRAGMENT = /^<(path|g|circle|rect|ellipse|line|polyline|polygon|defs|use|mask|clipPath|linearGradient|radialGradient|symbol|text|tspan)[\s>/]/i;

/**
 * Turn rendered markup into an SVG data URL.
 *
 * A single-root <svg> ships as-is. Markup that is a bare SVG *fragment* (one or
 * more paths/groups, as some packs render) is wrapped in a synthetic root so it
 * still reaches PowerPoint instead of leaving an empty icon well. Anything else
 * — notably the loading placeholder <span> — genuinely has nothing to draw and
 * returns null so the caller keeps its shape-only fallback.
 */
export function svgFromMarkup(markup: string): string | null {
  const trimmed = markup.trim();
  if (!trimmed) return null;
  if (/^<svg[\s>]/i.test(trimmed)) return toDataUrl(trimmed);
  if (SVG_FRAGMENT.test(trimmed)) {
    return toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${trimmed}</svg>`,
    );
  }
  return null;
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
    // Warmed icon-pack refs resolve straight off the pack JSON; everything else
    // goes through the same component the on-screen renderer picks.
    const packMarkup = packGlyphMarkup(override, color, strokeWidth);
    if (packMarkup) {
      out = svgFromMarkup(packMarkup);
      cache.set(key, out);
      if (out) return out;
    }
    const Icon = pickIcon(label, index, override);
    const markup = renderToStaticMarkup(
      createElement(Icon as never, {
        size: 24,
        color: color.startsWith("#") ? color : `#${color}`,
        strokeWidth,
      }),
    );
    out = svgFromMarkup(markup);
  } catch (e) {
    console.warn("[pptx-icons] glyph render failed", label, override, e);
    out = null;
  }
  cache.set(key, out);
  return out;
}
