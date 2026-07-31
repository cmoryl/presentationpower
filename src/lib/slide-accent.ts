// Single source of truth for the per-slide accent override.
//
// A slide may carry `content.accentOverride` (a `#rrggbb` string) so one deck
// can travel a multi-colour palette without inventing new brand modes. Every
// rendering path — on-screen VariantRenderer, PPTX export, print/PDF — must
// resolve it the same way, so the logic lives here and nowhere else.

import type { BrandMode } from "@/lib/taxonomy";

export const ACCENT_HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Returns the validated override hex, or undefined when absent/invalid. */
export function readAccentOverride(content: unknown): string | undefined {
  if (!content || typeof content !== "object") return undefined;
  const raw = (content as Record<string, unknown>).accentOverride;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return ACCENT_HEX_RE.test(v) ? v : undefined;
}

/** Resolved accent for a slide: validated override → deck brand accent. */
export function resolveSlideAccent(
  slide: { content?: unknown } | null | undefined,
  brand: Pick<BrandMode, "tokens">,
): string {
  return readAccentOverride(slide?.content) ?? brand.tokens.accent;
}

/** Brand mode with the slide's resolved accent swapped in (identity if none). */
export function applySlideAccent<T extends BrandMode>(
  slide: { content?: unknown } | null | undefined,
  brand: T,
): T {
  const override = readAccentOverride(slide?.content);
  if (!override) return brand;
  return { ...brand, tokens: { ...brand.tokens, accent: override } };
}

// ---- contrast utilities (hex-only, DOM-free) --------------------------

type RGB = [number, number, number];

export function parseHexColor(input: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function relativeLuminance(rgb: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/** WCAG contrast ratio between two hex colours. Returns 0 when unparseable. */
export function hexContrast(a: string, b: string): number {
  const ra = parseHexColor(a);
  const rb = parseHexColor(b);
  if (!ra || !rb) return 0;
  const la = relativeLuminance(ra);
  const lb = relativeLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Slide backdrop a mode resolves to, for contrast measurement. */
export const SLIDE_BG_DARK = "#03002C";
export const SLIDE_BG_LIGHT = "#FFFFFF";

export function slideBackgroundForMode(mode: "light" | "dark" | undefined): string {
  return mode === "dark" ? SLIDE_BG_DARK : SLIDE_BG_LIGHT;
}
