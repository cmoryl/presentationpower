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
