/**
 * PACK READABILITY GUARD
 * ======================
 *
 * Style packs paint a page in four planes (field → ground → scaffold → motif,
 * see style-packs.ts). Each plane is decorative, but every one of them shifts
 * the luminance behind the copy: a machined rail, a panel bloom, a grain plate.
 * Design review flagged Signal Room specifically — cold cyan signal + graphite
 * substrate + 5% grain — where muted and faint inks could sink into the
 * texture on the darker end of the sheet.
 *
 * This module answers one question, statically and without a DOM:
 *
 *    "Across every luminance the pack's own background layers can produce,
 *     does each ink token still clear the WCAG threshold?"
 *
 * It composites the pack's declared layers into a worst-case LIGHTEST and
 * DARKEST background, tests every ink token against BOTH, and returns:
 *   - corrected ink values (nudged along the pack's own hue, never recoloured)
 *   - a reading scrim alpha when correcting ink alone cannot close the gap
 *   - findings, so the picker/tests can show what was adjusted
 *
 * Decorative marks are never touched: only the text tokens are corrected.
 */

import { contrastRatio, normalizeHex, targetThresholds, type WcagTarget } from "./contrast-audit";
import {
  isCuratedGroundPack,
  packField,
  packGroundOpacity,
  packGroundPaint,
  type StylePack,
} from "./style-packs";

/* ── colour helpers ─────────────────────────────────────────────────────── */

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex, "#000000").slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function relLuminance({ r, g, b }: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** Composite `src` over `dst` at alpha `a`. */
function over(src: RGB, dst: RGB, a: number): RGB {
  const k = Math.max(0, Math.min(1, a));
  return {
    r: src.r * k + dst.r * (1 - k),
    g: src.g * k + dst.g * (1 - k),
    b: src.b * k + dst.b * (1 - k),
  };
}

/** Move a colour toward white/black by `t`, preserving its hue balance. */
function shade(c: RGB, t: number, toward: "white" | "black"): RGB {
  const target: RGB = toward === "white" ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  return over(target, c, t);
}

/* ── layer parsing ──────────────────────────────────────────────────────── */

type LayerPaint = { lightest: RGB; darkest: RGB; alpha: number };

const HEX_RE = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGBA_RE = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/gi;

/**
 * The luminance envelope a single CSS background layer can contribute.
 *
 * Gradients fade to transparent, so a layer's real influence anywhere on the
 * page ranges from 0 to its strongest stop. We keep the strongest alpha and the
 * lightest/darkest colour it paints — that is the worst case for copy.
 */
function parseLayer(layer: string): LayerPaint | null {
  const stops: Array<{ c: RGB; a: number }> = [];

  for (const m of layer.matchAll(HEX_RE)) {
    let hex = m[0];
    if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    stops.push({ c: hexToRgb(hex), a: 1 });
  }
  for (const m of layer.matchAll(RGBA_RE)) {
    stops.push({
      c: { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) },
      a: m[4] === undefined ? 1 : Number(m[4]),
    });
  }
  // Inline SVG data URIs encode their fills as %23rrggbb.
  for (const m of layer.matchAll(/%23([0-9a-f]{6})/gi)) {
    stops.push({ c: hexToRgb(`#${m[1]}`), a: 1 });
  }

  const visible = stops.filter((s) => s.a > 0.01);
  if (!visible.length) return null;

  let lightest = visible[0].c;
  let darkest = visible[0].c;
  let alpha = 0;
  for (const s of visible) {
    if (relLuminance(s.c) > relLuminance(lightest)) lightest = s.c;
    if (relLuminance(s.c) < relLuminance(darkest)) darkest = s.c;
    alpha = Math.max(alpha, s.a);
  }
  return { lightest, darkest, alpha };
}

/* ── background envelope ────────────────────────────────────────────────── */

export type BackgroundEnvelope = {
  /** Lightest background the pack's own layers can produce, as hex. */
  lightest: string;
  /** Darkest background the pack's own layers can produce, as hex. */
  darkest: string;
};

/**
 * Luminance the sheet must never cross. A light pack that lets its ground
 * blocks fall below this stops being a light pack: the guard then drags every
 * ink to near-black, which is exactly why the light looks read as dark and as
 * near-identical to each other. A dark pack has the mirror ceiling.
 */
const LIGHT_FLOOR = 0.56;
const DARK_CEILING = 0.26;

function envelopeAt(pack: StylePack, seed: string, damp: number): { light: RGB; dark: RGB } {
  const field = hexToRgb(packField(pack));
  const layers = packGroundPaint(pack, seed);
  let light = field;
  let dark = field;
  for (let i = layers.length - 1; i >= 0; i--) {
    const paint = parseLayer(layers[i]);
    if (!paint) continue;
    const a = paint.alpha * damp;
    light = over(paint.lightest, light, a);
    dark = over(paint.darkest, dark, a);
  }
  if (pack.grain > 0) {
    // A grain plate is a fine multiply/overlay screen, not a flood: at plate
    // opacity g it shifts the sheet by roughly g, not by half. The old 2.2x
    // worst case made every grainy light pack read as a dark sheet to the
    // guard, which is what flattened their inks to black.
    const g = Math.min(0.22, pack.grain * 1.4);
    light = shade(light, g * 0.5, "white");
    dark = shade(dark, g, "black");
  }
  return { light, dark };
}

/**
 * Plane-2 opacity actually used for a pack: the authored value, pulled back
 * until the sheet stays inside its own tonal register. Same answer everywhere
 * the pack paints, so the audit and the pixels can never disagree.
 */
export function packGroundDamp(pack: StylePack, seed = "readability"): number {
  const start = packGroundOpacity(pack);
  const ok = (damp: number) => {
    const { light, dark } = envelopeAt(pack, seed, damp);
    return pack.mode === "light"
      ? relLuminance(dark) >= LIGHT_FLOOR
      : relLuminance(light) <= DARK_CEILING;
  };
  // Curated skin scenes are the artwork: never damp them below the floor that
  // keeps the industry composition legible as a designed background. Contrast
  // is protected downstream by the readability scrim + ink guard instead.
  const floor = isCuratedGroundPack(pack) ? 0.66 : 0.06;
  let damp = start;
  while (damp > floor && !ok(damp)) damp = Number((damp - 0.03).toFixed(2));
  return Math.max(floor, Number(damp.toFixed(2)));
}

/**
 * Composite the pack's field + ground (+ grain) into a worst-case light and
 * dark background. Layers arrive topmost-first, so we walk them in reverse.
 */
export function packBackgroundEnvelope(pack: StylePack, seed = "readability"): BackgroundEnvelope {
  const { light, dark } = envelopeAt(pack, seed, packGroundDamp(pack, seed));
  return { lightest: rgbToHex(light), darkest: rgbToHex(dark) };
}


/* ── the guard ──────────────────────────────────────────────────────────── */

/** Ink tokens the guard is allowed to correct, with their reading role. */
const INK_ROLES = [
  { key: "ink", cssVar: "--pack-ink", large: false, label: "Primary ink" },
  { key: "inkMuted", cssVar: "--pack-ink-muted", large: false, label: "Muted ink" },
  { key: "inkFaint", cssVar: "--pack-ink-faint", large: true, label: "Faint ink" },
  { key: "accentText", cssVar: "--pack-accent-text", large: true, label: "Accent text" },
] as const;

export type ReadabilityFinding = {
  token: (typeof INK_ROLES)[number]["key"];
  label: string;
  /** Worst contrast ratio found across the background envelope. */
  ratio: number;
  required: number;
  original: string;
  corrected: string;
  /** Which end of the envelope was the problem. */
  against: string;
  fixed: boolean;
};

export type PackReadability = {
  packId: string;
  target: WcagTarget;
  envelope: BackgroundEnvelope;
  /** CSS custom-property overrides to merge after `stylePackCssVars`. */
  vars: Record<string, string>;
  /**
   * Alpha of a reading scrim (the pack's own surface colour) that must sit
   * above the decorative planes when ink correction alone cannot clear the
   * threshold. 0 means no scrim is needed.
   */
  scrimAlpha: number;
  findings: ReadabilityFinding[];
  /** True when every ink token clears the threshold after correction. */
  passes: boolean;
};

function worstRatio(ink: string, env: BackgroundEnvelope): { ratio: number; against: string } {
  const a = contrastRatio(ink, env.lightest);
  const b = contrastRatio(ink, env.darkest);
  return a <= b ? { ratio: a, against: env.lightest } : { ratio: b, against: env.darkest };
}

/**
 * Nudge an ink along the pack's own direction of travel (lighter on dark
 * sheets, darker on light sheets) until it clears `required` against BOTH ends
 * of the envelope. Hue is preserved; only lightness moves.
 */
function correctInk(ink: string, env: BackgroundEnvelope, required: number, mode: "light" | "dark") {
  const toward = mode === "dark" ? "white" : "black";
  const base = hexToRgb(ink);
  for (let step = 0; step <= 20; step++) {
    const candidate = rgbToHex(shade(base, step * 0.05, toward));
    if (worstRatio(candidate, env).ratio >= required) return candidate;
  }
  return mode === "dark" ? "#FFFFFF" : "#000000";
}

/**
 * Automatic contrast + readability check for a style pack.
 *
 * Runs against the pack's declared background layers, so the answer is the
 * same on every surface that paints the pack — library, present, share, print
 * and the thumbnail picker — with no measurement of the live DOM.
 */
export function packReadability(
  pack: StylePack,
  target: WcagTarget = "AA",
  seed = "readability",
): PackReadability {
  const th = targetThresholds(target);
  const env = packBackgroundEnvelope(pack, seed);
  const vars: Record<string, string> = {};
  const findings: ReadabilityFinding[] = [];
  let scrimAlpha = 0;

  for (const role of INK_ROLES) {
    const original = normalizeHex(pack.tokens[role.key], pack.tokens.ink);
    const required = role.large ? th.large : th.normal;
    const { ratio, against } = worstRatio(original, env);
    if (ratio >= required) continue;

    const corrected = correctInk(original, env, required, pack.mode);
    const after = worstRatio(corrected, env).ratio;
    const fixed = after >= required;
    if (corrected !== original) vars[role.cssVar] = corrected;
    if (!fixed) {
      // Ink alone cannot separate from the texture: veil the decorative planes
      // with the page field until the envelope collapses toward the surface.
      scrimAlpha = Math.max(scrimAlpha, Math.min(0.62, (required - after) / required + 0.28));
    }
    findings.push({
      token: role.key,
      label: role.label,
      ratio: Math.round(ratio * 100) / 100,
      required,
      original,
      corrected,
      against,
      fixed,
    });
  }

  return {
    packId: pack.id,
    target,
    envelope: env,
    vars,
    scrimAlpha,
    findings,
    passes: findings.every((f) => f.fixed),
  };
}
