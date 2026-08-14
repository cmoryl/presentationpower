// -----------------------------------------------------------------------------
// Surface → foreground token pairing (EXPORT SPEC: token pairing)
//
// The export path used to know only about fills. A renderer filled a card with
// a brand colour and left the copy inside it at the light-mode ink, so the
// exported library contained navy-on-navy text (WCAG ratio 1.00, i.e. text the
// same colour as the panel it sits on) across 54 slides.
//
// Every surface token therefore carries a paired foreground token here, and
// nothing in the export path may hardcode an ink colour inside a filled shape:
// it resolves the foreground through `foregroundOn()` instead.
//
// `#0A0F1C` is NOT a TransPerfect colour. It leaked in from an early non-brand
// dark and is canonicalised to the brand navy `#03002C` on the way out.
// -----------------------------------------------------------------------------

/** Body text must clear this WCAG contrast ratio against the fill behind it. */
export const MIN_TEXT_CONTRAST = 4.5;

/** Brand navy — the canonical dark. */
export const BRAND_NAVY = "03002C";
/** Non-brand darks that must never reach the file. */
export const NON_BRAND_INK: Record<string, string> = {
  "0A0F1C": BRAND_NAVY,
  "0A0F1B": BRAND_NAVY,
};

const norm = (hex: string | null | undefined): string =>
  (hex ?? "").replace("#", "").trim().toUpperCase().slice(0, 6);

/** Replace leaked non-brand darks with their palette equivalent. */
export function canonicalizeInk(hex: string | null | undefined): string {
  const h = norm(hex);
  if (h.length !== 6) return h;
  return NON_BRAND_INK[h] ?? h;
}

/**
 * The pairing table. Keys are surface fills the design system actually paints;
 * values are the only foreground allowed on them.
 */
export const SURFACE_FOREGROUND: Record<string, string> = {
  // Dark surfaces → white.
  "03002C": "FFFFFF",
  "003FC7": "FFFFFF",
  "003EC9": "FFFFFF",
  "3900E6": "FFFFFF",
  "141435": "FFFFFF",
  "0A0830": "FFFFFF",
  // Light surfaces → brand navy.
  FFFFFF: BRAND_NAVY,
  FAFBFF: BRAND_NAVY,
  F2F2F2: BRAND_NAVY,
  E0E8F5: BRAND_NAVY,
  // Tertiary pops are all light chips.
  FFEB66: BRAND_NAVY,
  A6FA87: BRAND_NAVY,
  FF9B70: BRAND_NAVY,
  A1FBF9: BRAND_NAVY,
  C2A3FF: BRAND_NAVY,
};

/** sRGB relative luminance of a 6-digit hex. */
export function relativeLuminance(hex: string): number {
  const h = norm(hex);
  if (h.length !== 6) return 1;
  const n = parseInt(h, 16);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255)
  );
}

/** WCAG 2.1 contrast ratio between two hex colours (1 → identical). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(canonicalizeInk(a));
  const lb = relativeLuminance(canonicalizeInk(b));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * The foreground token paired with a surface fill. Unknown fills fall back to
 * whichever of white / brand navy has the higher contrast, so a colour nobody
 * tabulated still comes out legible rather than invisible.
 */
export function foregroundOn(fillHex: string | null | undefined): string {
  const fill = canonicalizeInk(fillHex);
  if (fill.length !== 6) return BRAND_NAVY;
  const paired = SURFACE_FOREGROUND[fill];
  if (paired) return paired;
  return contrastRatio("FFFFFF", fill) >= contrastRatio(BRAND_NAVY, fill)
    ? "FFFFFF"
    : BRAND_NAVY;
}

/**
 * Resolve the colour a run of text may actually use on a given fill: keep the
 * designed colour when it clears the threshold, otherwise swap in the paired
 * foreground. This is the single call every renderer/guard makes.
 */
export function resolveForeground(
  textHex: string | null | undefined,
  fillHex: string | null | undefined,
): string {
  const text = canonicalizeInk(textHex);
  const fill = canonicalizeInk(fillHex);
  if (text.length !== 6) return foregroundOn(fill);
  if (fill.length !== 6) return text;
  return contrastRatio(text, fill) >= MIN_TEXT_CONTRAST ? text : foregroundOn(fill);
}
