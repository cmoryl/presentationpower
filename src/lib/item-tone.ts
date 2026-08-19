// Per-item accent tone overrides.
//
// Some modules (layer stacks, pillar rows) colour each row/lane from a fixed
// rotation. Authors can override a single row's tone by storing a hex value on
// the item itself (`item.tone`), which drives that row's wash gradient, rail and
// hairline frame — in the live slide, the canvas editor, and every export (they
// all read the same DOM).

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
