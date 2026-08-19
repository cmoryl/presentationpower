// Appearance-aware re-inking for canvas compositions.
//
// Open Canvas Studio / Module Studio compositions carry two kinds of colour:
//
//   * implicit ink — a text item with no `color`, which already follows the
//     composition's light/dark mode at render time;
//   * baked ink — an explicit colour, usually inherited when a preset module was
//     adopted or exploded into free blocks (its plates and copy were flattened
//     to concrete hex values at the mode they were authored in).
//
// Flipping the appearance switch used to leave the baked values behind, so a
// composition switched to Dark kept near-black copy on a near-black stage and
// looked broken. This module re-inks the *neutral* baked values for the new
// mode while leaving anything with real hue (brand accents, tinted plates,
// photography) untouched.

import type { CanvasItem } from "./canvas-studio";

export type SlideAppearance = "light" | "dark";

const LIGHT_INK = "#03002C";
const DARK_INK = "#FFFFFF";

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(input: string): Rgba | null {
  const value = input.trim();
  const hex = /^#?([a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const int = parseInt(h.slice(0, 6), 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb) {
    const parts = rgb[1].split(",").map((p) => parseFloat(p));
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  return null;
}

function relLuminance({ r, g, b }: Rgba): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Chroma spread — a neutral (grey/near-black/near-white) ink has almost none. */
function chroma({ r, g, b }: Rgba): number {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/**
 * True when a baked colour is neutral slide ink rather than a deliberate hue.
 * Deep navy brand ink (#03002C) reads as slightly blue, so the tolerance is
 * generous for very dark and very light values and tight in the mid range.
 */
export function isNeutralInk(color: string): boolean {
  const c = parseColor(color);
  if (!c) return false;
  const lum = relLuminance(c);
  const ch = chroma(c);
  if (lum <= 0.06 || lum >= 0.9) return ch <= 0.22;
  return ch <= 0.08;
}

/** Ink for a target appearance, keeping the source's emphasis tier and alpha. */
function reInk(color: string, to: SlideAppearance): string | null {
  const c = parseColor(color);
  if (!c) return null;
  const lum = relLuminance(c);
  const towardsDark = lum < 0.4;
  // Already correct for the destination mode — leave it alone.
  if (to === "dark" && !towardsDark) return null;
  if (to === "light" && towardsDark) return null;
  // Emphasis tier: how far the ink sat from its own backdrop.
  const distance = to === "dark" ? 1 - lum / 0.4 : (lum - 0.6) / 0.4;
  const tier = distance >= 0.72 ? 1 : distance >= 0.35 ? 0.72 : 0.54;
  const alpha = Math.max(0, Math.min(1, c.a)) * tier;
  const base = to === "dark" ? "255,255,255" : "3,0,44";
  if (alpha >= 0.995) return to === "dark" ? DARK_INK : LIGHT_INK;
  return `rgba(${base},${Number(alpha.toFixed(3))})`;
}

/** Neutral plate fill for the destination mode, preserving its own alpha. */
function rePlate(color: string, to: SlideAppearance): string | null {
  const c = parseColor(color);
  if (!c) return null;
  const lum = relLuminance(c);
  if (to === "dark" && lum < 0.4) return null;
  if (to === "light" && lum >= 0.4) return null;
  const alpha = Math.max(0, Math.min(1, c.a));
  const base = to === "dark" ? "10,8,48" : "255,255,255";
  return `rgba(${base},${Number(alpha.toFixed(3))})`;
}

/**
 * Re-ink every item in a composition for a new appearance.
 *
 * Returns the items (a new array only when something changed) plus a count of
 * re-inked layers, so the UI can tell the user what it just did.
 */
export function retintItemsForMode(
  items: readonly CanvasItem[],
  from: SlideAppearance,
  to: SlideAppearance,
): { items: CanvasItem[]; changed: number } {
  if (from === to) return { items: [...items], changed: 0 };
  let changed = 0;
  const next = items.map((item) => {
    switch (item.type) {
      case "text": {
        if (!item.color || !isNeutralInk(item.color)) return item;
        const color = reInk(item.color, to);
        if (!color || color === item.color) return item;
        changed++;
        return { ...item, color };
      }
      case "stat": {
        if (!item.accent || !isNeutralInk(item.accent)) return item;
        const accent = reInk(item.accent, to);
        if (!accent || accent === item.accent) return item;
        changed++;
        return { ...item, accent };
      }
      case "surface": {
        let patch: Partial<typeof item> = {};
        if (item.fill && isNeutralInk(item.fill)) {
          const fill = rePlate(item.fill, to);
          if (fill && fill !== item.fill) patch = { ...patch, fill };
        }
        if (item.stroke && isNeutralInk(item.stroke)) {
          const stroke = reInk(item.stroke, to);
          if (stroke && stroke !== item.stroke) patch = { ...patch, stroke };
        }
        if (!Object.keys(patch).length) return item;
        changed++;
        return { ...item, ...patch };
      }
      case "module": {
        // A module pinned to the mode we are leaving was following the slide,
        // not overriding it — let it keep following.
        if (item.mode !== from) return item;
        changed++;
        return { ...item, mode: to };
      }
      default:
        return item;
    }
  });
  return { items: changed ? next : [...items], changed };
}
