// Automatic contrast guard for statistic figures (gradient text + glow).
//
// Division accents are chosen for brand pop, not readability. On dark artwork
// several of them (deep blue, violet, red) fall well below WCAG AA-Large
// against the slide background, and adding a glow in the same hue makes the
// glyph edges smear further. This module derives a *safe* variant of the
// accent for text use, plus a glow colour that is only applied when it can't
// hurt legibility.

const AA_LARGE = 3;
const TARGET = 4.5;

export const DARK_STAT_BG = "#03002C";
export const LIGHT_STAT_BG = "#FFFFFF";

type RGB = [number, number, number];

function parseHex(input: string): RGB | null {
  const s = input.trim();
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = /rgba?\(([^)]+)\)/i.exec(s);
  if (rgb) {
    const parts = rgb[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length >= 3 && !parts.slice(0, 3).some(Number.isNaN))
      return [parts[0], parts[1], parts[2]];
  }
  return null;
}

const toHex = ([r, g, b]: RGB) =>
  "#" +
  [r, g, b]
    .map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0"))
    .join("");

function relLum([r, g, b]: RGB) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function ratio(a: RGB, b: RGB) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export type StatColors = {
  /** Accent nudged just far enough to clear the contrast target. */
  base: string;
  /** Lighter/darker end of the gradient ramp — also contrast-checked. */
  bright: string;
  /** Kept in the type for compatibility, but module slides no longer emit
   *  a decorative glow/drop-shadow. Always undefined now. */
  glow?: string;
  /** Achieved contrast ratio of `base` against the backdrop. */
  contrast: number;
  /** True when the raw accent already passed and needed no correction. */
  passedRaw: boolean;
};

/**
 * Derive readable gradient stops for statistic text.
 *
 * The accent is progressively mixed toward white (dark backdrops) or toward
 * the ink colour (light backdrops) until it clears AA-Large. Decorative
 * drop-shadow/glow is intentionally disabled for module-slide text to keep
 * the brand system flat and consistent across surfaces.
 */
export function statColors(
  accent: string,
  mode: "light" | "dark",
  opts: { bg?: string; ink?: string } = {},
): StatColors {
  const bg = parseHex(opts.bg ?? (mode === "dark" ? DARK_STAT_BG : LIGHT_STAT_BG)) ?? [3, 0, 44];
  const raw = parseHex(accent);
  if (!raw) {
    const fallback = mode === "dark" ? "#FFFFFF" : "#03002C";
    return { base: fallback, bright: fallback, contrast: 21, passedRaw: false };
  }
  const toward: RGB =
    mode === "dark" ? [255, 255, 255] : (parseHex(opts.ink ?? "#03002C") ?? [3, 0, 44]);

  let base = raw;
  let c = ratio(raw, bg);
  const passedRaw = c >= TARGET;
  if (!passedRaw) {
    // 20 linear steps is plenty; stop at the first stop clearing the target,
    // falling back to the endpoint (white / ink) when the hue can't get there.
    for (let i = 1; i <= 20; i++) {
      const cand = mix(raw, toward, i / 20);
      const cc = ratio(cand, bg);
      base = cand;
      c = cc;
      if (cc >= TARGET) break;
    }
  }

  // Gradient tail: lift further on dark, deepen on light, but never below the
  // AA-Large floor so the mid-glyph band stays readable too.
  let bright = mix(base, toward, mode === "dark" ? 0.35 : 0.3);
  if (ratio(bright, bg) < AA_LARGE) bright = base;

  // Drop shadows are intentionally removed from module-slide text to keep
  // the treatment flat and brand-system-consistent across surfaces.
  const glow: string | undefined = undefined;

  return { base: toHex(base), bright: toHex(bright), glow, contrast: c, passedRaw };
}

/** Convenience: contrast-checked `linear-gradient` for text-clip figures. */
export function statGradient(
  accent: string,
  mode: "light" | "dark",
  angle = "100deg",
  opts: { bg?: string; ink?: string } = {},
): { backgroundImage: string; filter?: string; contrast: number } {
  const { base, bright, glow, contrast } = statColors(accent, mode, opts);
  return {
    backgroundImage:
      mode === "dark"
        ? `linear-gradient(${angle}, ${bright} 0%, ${base} 55%, ${bright} 100%)`
        : `linear-gradient(${angle}, ${base} 0%, ${bright} 100%)`,
    filter: glow,
    contrast,
  };
}
