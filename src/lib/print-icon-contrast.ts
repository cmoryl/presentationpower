/**
 * Contrast checking for print module iconography.
 *
 * Icons are graphical objects, so WCAG 2.1 SC 1.4.11 (Non-text Contrast)
 * applies: the glyph strokes need at least 3:1 against the paper they sit on.
 * Thin strokes make a marginal ratio worse in print, so we also flag the
 * 3:1–4.5:1 band as "tight" once the stroke multiplier is below 1.
 */

export type IconContrastStatus = "pass" | "tight" | "fail";

export type IconContrastResult = {
  /** Contrast ratio of the accent against the page background (1–21). */
  ratio: number;
  status: IconContrastStatus;
  /** Non-text contrast minimum applied (3:1, or 4.5:1 for hairline strokes). */
  required: number;
  /** Human sentence for the UI — empty when status is "pass". */
  message: string;
  /** Nearest accent (same hue) that clears `required`, when one exists. */
  suggestion?: string;
  /** Background the accent was measured against. */
  background: string;
};

type RGB = { r: number; g: number; b: number };

const NAMED: Record<string, string> = {
  white: "#FFFFFF",
  black: "#000000",
  transparent: "#FFFFFF",
};

/** Parse hex (#rgb/#rrggbb), rgb()/rgba() and a couple of keywords. */
export function parseIconColor(input: string | undefined | null): RGB | null {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const [r, g, b] = hex.split("");
      return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16) };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some((n) => Number.isNaN(n))) return null;
  const alpha = parts[3] ?? 1;
  // Composite over white — print stock is the practical worst case.
  const over = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return { r: over(parts[0]), g: over(parts[1]), b: over(parts[2]) };
}

function luminance({ r, g, b }: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two CSS colours (1–21); 0 when unparseable. */
export function iconContrastRatio(a: string, b: string): number {
  const ca = parseIconColor(a);
  const cb = parseIconColor(b);
  if (!ca || !cb) return 0;
  const l1 = luminance(ca);
  const l2 = luminance(cb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function toHex({ r, g, b }: RGB): string {
  const h = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

/**
 * Nearest same-hue accent that clears `required` against `background`: step the
 * colour toward black on light stock (toward white on dark stock) until it does.
 */
export function suggestIconAccent(
  accent: string,
  background: string,
  required: number,
): string | undefined {
  const a = parseIconColor(accent);
  const bg = parseIconColor(background);
  if (!a || !bg) return undefined;
  const towardWhite = luminance(bg) < 0.5;
  const target: RGB = towardWhite ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const candidate = mix(a, target, t);
    const hex = toHex(candidate);
    if (iconContrastRatio(hex, background) >= required) return hex;
  }
  return undefined;
}

/** Background a print page renders icons on, given the editor/print mode. */
export function iconPageBackground(mode: string | undefined): string {
  return mode === "dark" ? "#03002C" : "#FFFFFF";
}

/**
 * Evaluate an icon accent against the page it prints on.
 *
 * @param accent CSS colour for the glyph strokes. Falsy = section default,
 *   which is already contrast-managed, so the check passes.
 * @param background Paper / page background colour.
 * @param stroke Stroke-width multiplier (from the iconography controls).
 */
export function checkIconAccentContrast(
  accent: string | undefined | null,
  background: string,
  stroke = 1,
): IconContrastResult {
  const bg = background || "#FFFFFF";
  if (!accent) {
    return {
      ratio: 21,
      status: "pass",
      required: 3,
      message: "",
      background: bg,
    };
  }
  // Hairline glyphs read lighter than their measured colour on paper, so hold
  // them to the text minimum instead of the 3:1 graphical-object minimum.
  const required = stroke < 1 ? 4.5 : 3;
  const ratio = iconContrastRatio(accent, bg);
  const rounded = Math.round(ratio * 100) / 100;
  if (ratio <= 0) {
    return { ratio: 0, status: "pass", required, message: "", background: bg };
  }
  if (ratio >= required + 1.5) {
    return { ratio: rounded, status: "pass", required, message: "", background: bg };
  }
  const suggestion = suggestIconAccent(accent, bg, required);
  if (ratio < required) {
    return {
      ratio: rounded,
      status: "fail",
      required,
      message: `Icon accent contrast is ${rounded}:1 — below the ${required}:1 minimum for ${
        stroke < 1 ? "hairline" : "graphical"
      } elements. These glyphs will be hard to read${stroke < 1 ? " at this stroke weight" : ""}.`,
      ...(suggestion ? { suggestion } : {}),
      background: bg,
    };
  }
  return {
    ratio: rounded,
    status: "tight",
    required,
    message: `Icon accent contrast is ${rounded}:1 — it clears the ${required}:1 minimum but only just, so glyphs may fade in print.`,
    ...(suggestion ? { suggestion } : {}),
    background: bg,
  };
}
// -----------------------------------------------------------------------------
// Icon ink contrast for print surfaces
//
// Print layouts draw their glyphs in the brand colour — usually TransPerfect
// Blue 500 (#003FC7) or Blue 800 (#03002C). On a white sheet that is exactly
// right. On the dark variant of the same template the sheet itself is Blue 800,
// so a Blue 500 / Blue 800 glyph all but disappears: the MSA dark preview shows
// the solution-grid icons as barely-there shapes inside their chips.
//
// Rather than hand-picking a second colour per layout, glyph ink is derived:
// keep the brand hue, and lift (or, on a light sheet, deepen) only its
// lightness until the stroke actually reads against the sheet. Brand colour
// stays recognisable; contrast stops depending on which mode you opened.
// -----------------------------------------------------------------------------

export type PrintSurface = "light" | "dark";

type Hsl = { h: number; s: number; l: number; a: number };

function parseColor(input: string): Hsl | null {
  const c = input.trim().toLowerCase();
  let r: number, g: number, b: number, a = 1;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(c);
  if (hex) {
    const h = hex[1]!;
    const expand = (s: string) => parseInt(s.length === 1 ? s + s : s, 16);
    if (h.length <= 4) {
      r = expand(h[0]!);
      g = expand(h[1]!);
      b = expand(h[2]!);
      if (h.length === 4) a = expand(h[3]!) / 255;
    } else {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
      if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
    }
  } else {
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/.exec(c);
    if (!rgb) return null; // color-mix(), var(), named colours: leave alone
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
    if (rgb[4]) a = rgb[4].endsWith("%") ? Number(rgb[4].slice(0, -1)) / 100 : Number(rgb[4]);
  }
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s, l, a };
}

/** Perceived lightness of a colour, 0 (black) → 1 (white). */
function luminance(hsl: Hsl): number {
  // HSL lightness is a good enough proxy here; glyphs are strokes, not fills.
  return hsl.l;
}

function toCss({ h, s, l, a }: Hsl): string {
  const hue = Math.round(((h % 360) + 360) % 360);
  const sat = Math.round(Math.min(1, Math.max(0, s)) * 100);
  const light = Math.round(Math.min(1, Math.max(0, l)) * 100);
  return a >= 1 ? `hsl(${hue} ${sat}% ${light}%)` : `hsl(${hue} ${sat}% ${light}% / ${a})`;
}

/** On a dark sheet a glyph below this lightness reads as a hole, not a mark. */
const DARK_MIN_L = 0.62;
/** On a white sheet anything above this washes out. */
const LIGHT_MAX_L = 0.72;
/** Very desaturated brand darks (near-black navy) need some chroma back once lifted. */
const MIN_SAT_ON_DARK = 0.35;

/**
 * Resolve the stroke colour a print glyph should actually use on a given sheet.
 * Returns the input untouched when it already reads, or when it is a colour
 * form we cannot safely reason about (color-mix, var, currentColor).
 */
export function printIconInk(surface: PrintSurface, color: string): string {
  const hsl = parseColor(color);
  if (!hsl) return color;
  const lum = luminance(hsl);
  if (surface === "dark") {
    if (lum >= DARK_MIN_L) return color;
    return toCss({
      h: hsl.h,
      // Pure-black/navy inks come back as a soft brand tint rather than grey.
      s: hsl.s < 0.05 ? 0 : Math.max(hsl.s, MIN_SAT_ON_DARK),
      l: DARK_MIN_L + (hsl.s < 0.05 ? 0.28 : 0.14),
      a: hsl.a,
    });
  }
  if (lum <= LIGHT_MAX_L) return color;
  return toCss({ h: hsl.h, s: Math.max(hsl.s, 0.2), l: 0.38, a: hsl.a });
}
