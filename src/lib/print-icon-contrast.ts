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
