// Per-item accent tone overrides.
//
// Some modules (layer stacks, pillar rows) colour each row/lane from a fixed
// rotation. Authors can override a single row's tone by storing a hex value on
// the item itself (`item.tone`), which drives that row's wash gradient, rail and
// hairline frame — in the live slide, the canvas editor, and every export (they
// all read the same DOM).

import { FADE_STOPS } from "@/lib/surface-tokens";

/** Brand-safe swatches offered in the tone picker. */
export const TONE_SWATCHES: Array<{ label: string; hex: string }> = [
  { label: "Blue", hex: "#003FC7" },
  { label: "Aqua", hex: "#A1FBF9" },
  { label: "Lavender", hex: "#C2A3FF" },
  { label: "Pink", hex: "#EC388A" },
  { label: "Green", hex: "#A6FA87" },
  { label: "Yellow", hex: "#FFEB66" },
  { label: "Peach", hex: "#FF9B70" },
  { label: "Red", hex: "#E53D2E" },
  { label: "Teal", hex: "#0E7A86" },
  { label: "Gray", hex: "#666666" },
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isToneHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v.trim());
}

/** Read an item's tone override, or null when unset/invalid. */
export function itemTone(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const v = (item as Record<string, unknown>)["tone"];
  return isToneHex(v) ? v.trim() : null;
}

/** Read an item's gradient END tone override, or null when unset/invalid. */
export function itemToneEnd(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const v = (item as Record<string, unknown>)["toneEnd"];
  return isToneHex(v) ? v.trim() : null;
}

/**
 * Two-colour version of the canonical top-lit card wash: `start` tints the top
 * of the box, `end` tints the fade-out band. When `end` is null the wash falls
 * back to the single-colour house wash (identical output to
 * {@link cardWashGradient}), so unset rows are pixel-identical to before.
 */
export function toneWashGradient(start: string, end: string | null): string {
  const { washTop, washMid, washMidAt, washEndAt } = FADE_STOPS;
  const tail = end ?? start;
  return `linear-gradient(180deg, color-mix(in oklab, ${start} ${washTop}%, transparent) 0%, color-mix(in oklab, ${tail} ${washMid + 4}%, transparent) ${washMidAt}%, color-mix(in oklab, ${tail} ${washMid}%, transparent) ${Math.round((washMidAt + washEndAt) / 2)}%, transparent ${washEndAt}%)`;
}

/** Solid-plate equivalent: a soft start→end sweep for filled tiles. */
export function tonePlateGradient(start: string, end: string | null): string {
  if (!end) return `linear-gradient(180deg, ${start}, ${start})`;
  return `linear-gradient(160deg, ${start} 0%, ${end} 100%)`;
}
