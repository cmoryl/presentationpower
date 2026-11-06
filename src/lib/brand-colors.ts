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

/**
 * SPECTRUM — the corporate deck style from the TransPerfect PowerPoint Style
 * Guide (MarComm, Q4 2026). Full replacement of the previous enterprise card
 * look for slide modules, decks, sales presets and the presentation agent.
 * Light-first: every corporate slide sits on the white→lilac canvas; there are
 * no dark corporate pages. Events, Bowl, print and social keep BRAND above.
 */
export const SPECTRUM = {
  /** Text colors by role. */
  ink: BRAND.ink, // titles & headings
  body: "#3D3B5C", // running text
  eyebrow: BRAND.blue, // eyebrows & links
  footnote: "#5E6B99", // footnotes / sources
  /** Theme palette additions. */
  slate: "#424061",
  mist: "#E6E6EA",
  royal: "#2F5FDB",
  sky: "#8AB8FF",
  ice: "#B9D6FF",
  /** Light canvas: white → lilac. */
  canvas: { from: "#FFFFFF", to: "#F0F3FB" },
  /** Spectrum stages — always in this order: aqua 1st, blue 2nd, violet 3rd. */
  stages: [
    {
      name: "aqua",
      brand: "#0FB5B2",
      light: BRAND.aqua,
      deep: "#0A8E99",
      tint: "#C9F6F4",
      tintSoft: "#E3FDFC",
    },
    {
      name: "blue",
      brand: "#3B7BF0",
      light: "#8AB8FF",
      deep: "#1A3FC2",
      tint: "#CFE0FF",
      tintSoft: "#E6EFFF",
    },
    {
      name: "violet",
      brand: "#8F6BF0",
      light: BRAND.lavender,
      deep: "#3D1FA6",
      tint: "#DDD0FF",
      tintSoft: "#EFE7FF",
    },
  ],
  /** The only deep saturated block allowed — one per slide, GlobalLink only. */
  globalLinkCard: ["#1F6FD1", "#2F55D6", "#6440D2"],
  /** Frost card — the corporate container spec. */
  frostCard: {
    /** Corner radius, inches (0.22″ ≈ 32 stage px at 144 px/in). */
    radiusIn: 0.22,
    /** 90° fill gradient. */
    fillFrom: "#FFFFFF",
    fillTo: "#F0F3FB",
    /** 0.75 pt keyline. */
    line: "#D6DCF0",
    linePt: 0.75,
    /** Outer shadow: ink at 7% (93% transparent), blur 18 pt, distance 7 pt. */
    shadowColor: BRAND.ink,
    shadowAlpha: 0.07,
    shadowBlurPt: 18,
    shadowDistancePt: 7,
  },
} as const;

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

/** Full text of the generated src/styles/brand-tokens.css. */
export function brandTokensCss(): string {
  const lines = Object.entries(brandCssVars()).map(([k, v]) => `  ${k}: ${v};`);
  return `/* GENERATED from src/lib/brand-colors.ts by scripts/gen-brand-css.ts — do not edit. */\n:root {\n${lines.join("\n")}\n}\n`;
}
