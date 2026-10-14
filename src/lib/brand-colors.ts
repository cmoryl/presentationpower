/**
 * THE colour file. Every format — screen (CSS), slides, PowerPoint, print and
 * social — reads TransPerfect brand colours from here. Brand v3.0 values.
 *
 * Rules
 *  - Never type a brand hex anywhere else; import it from this file.
 *  - RGB is the house colour space. CMYK/Pantone builds live in
 *    print-color-contract.ts and are never derived automatically from these.
 *  - `src/lib/__tests__/brand-colors-parity.test.ts` fails if CSS tokens or the
 *    format feeders drift from this file.
 */

const BRAND_HEX = {
  /** Blue 800 — dark ground, body ink. */
  ink: "#03002C",
  /** Blue 500 — principal action / accent. */
  blue: "#003FC7",
  /** Enterprise surface. */
  surface: "#EEF1F7",
  white: "#FFFFFF",
  /** Secondary accents — keep to ~10% of a composition. */
  aqua: "#A1FBF9",
  lavender: "#C2A3FF",
  /** Tertiary pops — data/status signals only. */
  yellow: "#FFEB66",
  green: "#A6FA87",
  peach: "#FF9B70",
  pink: "#EC388A",
  red: "#E53D2E",
  /** Neutrals. */
  darkGray: "#666666",
  lightGray: "#F2F2F2",
  blueWhite: "#E0E8F5",
} as const;

/** Values typed as plain strings so they can seed editable colour state. */
export const BRAND: { readonly [K in keyof typeof BRAND_HEX]: string } = BRAND_HEX;

export type BrandColor = keyof typeof BRAND;

/** Enterprise brand-mode tokens (every TransPerfect division uses these). */
export const ENTERPRISE_TOKENS = {
  primary: BRAND.ink,
  accent: BRAND.blue,
  surface: BRAND.surface,
  ink: BRAND.ink,
} as const;

/** Full-ramp accent sequence (hairline frames, ramp bars). */
export const ACCENT_RAMP = [
  "#13b1f3", // City blue
  "#5ce1e6", // Aqua (ramp tint)
  BRAND.green.toLowerCase(),
  BRAND.yellow.toLowerCase(),
  BRAND.peach.toLowerCase(),
  BRAND.pink.toLowerCase(),
  BRAND.lavender.toLowerCase(),
] as const;

/** Hex without '#', as PowerPoint/pptxgenjs expects. */
export const pptxHex = (hex: string) => hex.replace("#", "").toUpperCase();

/** CSS custom properties generated from this file (for parity checks / injection). */
export function brandCssVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(BRAND)) {
    out[`--tp-${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`] = v.toLowerCase();
  }
  ACCENT_RAMP.forEach((v, i) => (out[`--tp-accent-${i + 1}`] = v));
  return out;
}
