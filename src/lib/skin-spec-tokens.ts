/**
 * APPROVED SPEC TOKENS — the sheet's own gradient / opacity / type / layout /
 * icon codes, parsed into numbers the renderer can use.
 *
 * Every approved visual language (S01–S28) carries a `spec` line straight from
 * the OnDeck catalog, e.g.
 *
 *   "GRADIENT G02 / G04  ·  OPACITY O16–56  ·  TYPE T01  ·  LAYOUT L01 / L04  ·  ICON I02"
 *
 * Until now that line was documentation: the background engine used one global
 * opacity ceiling for all 28 languages. This module turns the codes into real
 * tokens so the sheet drives the art:
 *
 *   • `opacity` → the language's own atmosphere band (min/max alpha). A skin
 *     specified O08–64 is allowed to be more present than one specified O10–28.
 *   • `gradient` → the gradient recipes the language is allowed to use; the
 *     count and the first code bias how directional vs radial its washes read.
 *
 * Parsing is tolerant: anything missing falls back to the previous global
 * defaults, so a skin with no spec (or a custom admin template) renders exactly
 * as before.
 */

import type { DesignSkin } from "./design-skins";

/** Previous global behaviour, used whenever the sheet is silent. */
export const DEFAULT_OPACITY_BAND: [number, number] = [0.08, 0.56];

export interface SkinSpecTokens {
  /** Gradient recipe codes, e.g. ["G02", "G04"]. */
  gradient: string[];
  /** Type scale code, e.g. "T01". */
  type: string | null;
  /** Layout family codes, e.g. ["L01", "L04"]. */
  layout: string[];
  /** Icon set code, e.g. "I02". */
  icon: string | null;
  /** Atmosphere alpha band as fractions, e.g. [0.16, 0.56]. */
  opacity: [number, number];
  /**
   * Gradient character derived from the recipe codes:
   * 0 = purely radial atmosphere, 1 = strongly directional/linear.
   */
  directionality: number;
}

function codes(spec: string, key: string, prefix: string): string[] {
  const re = new RegExp(`${key}\\s+([${prefix}\\d\\s/,·-]+?)(?:\\s{2,}|·|$)`, "i");
  const m = re.exec(spec);
  if (!m) return [];
  return (m[1] ?? "")
    .split(/[/,]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => new RegExp(`^${prefix}\\d+$`).test(s));
}

/** "OPACITY O16–56" / "O08-64" → [0.16, 0.56]. */
function opacityBand(spec: string): [number, number] {
  const m = /OPACITY\s+O?(\d{1,3})\s*(?:[–—-]|to)\s*O?(\d{1,3})/i.exec(spec);
  if (!m) return DEFAULT_OPACITY_BAND;
  const lo = Math.min(parseInt(m[1]!, 10), parseInt(m[2]!, 10)) / 100;
  const hi = Math.max(parseInt(m[1]!, 10), parseInt(m[2]!, 10)) / 100;
  // Guard the reading layer: nothing decorative may exceed the glass ceiling,
  // and a band narrower than 6% would flatten the tier hierarchy.
  const max = Math.min(0.62, Math.max(0.18, hi));
  const min = Math.min(max - 0.06, Math.max(0.04, lo));
  return [min, max];
}

const cache = new Map<string, SkinSpecTokens>();

export function skinSpecTokens(skin: DesignSkin): SkinSpecTokens {
  const key = `${skin.code}|${skin.spec ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const spec = skin.spec ?? "";
  const gradient = codes(spec, "GRADIENT", "G");
  const layout = codes(spec, "LAYOUT", "L");
  const type = codes(spec, "TYPE", "T")[0] ?? null;
  const icon = codes(spec, "ICON", "I")[0] ?? null;
  const opacity = opacityBand(spec);

  // G01–G03 read as flat/linear infrastructure, G04+ as atmospheric mesh.
  const nums = gradient.map((g) => parseInt(g.slice(1), 10)).filter((n) => Number.isFinite(n));
  const directionality = nums.length
    ? Math.max(0, Math.min(1, 1 - (nums.reduce((a, b) => a + b, 0) / nums.length - 1) / 6))
    : 0.5;

  const out: SkinSpecTokens = { gradient, type, layout, icon, opacity, directionality };
  cache.set(key, out);
  return out;
}

/** Ceiling for decorative alpha on this language. */
export function skinOpacityCeiling(skin: DesignSkin): number {
  return skinSpecTokens(skin).opacity[1];
}

/** Floor for decorative alpha — how present the language is at its quietest. */
export function skinOpacityFloor(skin: DesignSkin): number {
  return skinSpecTokens(skin).opacity[0];
}

/** Human-readable gradient + opacity summary for library cards. */
export function skinSpecSummary(skin: DesignSkin): string {
  const t = skinSpecTokens(skin);
  const grad = t.gradient.length ? t.gradient.join(" / ") : "G—";
  const [lo, hi] = t.opacity;
  return `${grad} · opacity ${Math.round(lo * 100)}–${Math.round(hi * 100)}%`;
}
