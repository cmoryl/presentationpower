// Pure PPTX color math (hex/HSL transforms + modifier application).
// Split out of pptx-import so UI code (FaithfulSlideCanvas) can apply color
// mods at paint time without dragging JSZip + fast-xml-parser into the
// client bundle.

export type ColorMods = {
  lumMod?: number; // 0..1
  lumOff?: number; // 0..1
  shade?: number; // 0..1
  tint?: number; // 0..1
  satMod?: number; // multiplier
  alpha?: number; // 0..1
};


function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = s === 0 ? l : hue2rgb(h + 1 / 3);
  const g = s === 0 ? l : hue2rgb(h);
  const b = s === 0 ? l : hue2rgb(h - 1 / 3);
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(1, n)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Apply PPTX color modifiers to a hex color. Order: satMod → lumMod/lumOff → shade/tint. */
export function applyColorMods(hex: string, mods: ColorMods): string {
  let [h, s, l] = hexToHsl(hex);
  if (mods.satMod !== undefined) s = Math.max(0, Math.min(1, s * mods.satMod));
  if (mods.lumMod !== undefined) l = Math.max(0, Math.min(1, l * mods.lumMod));
  if (mods.lumOff !== undefined) l = Math.max(0, Math.min(1, l + mods.lumOff));
  let out = hslToHex(h, s, l);
  // shade: blend toward black; tint: blend toward white
  if (mods.shade !== undefined) {
    const m = out.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16) * mods.shade;
    const g = parseInt(m.slice(2, 4), 16) * mods.shade;
    const b = parseInt(m.slice(4, 6), 16) * mods.shade;
    const to = (n: number) =>
      Math.round(Math.max(0, Math.min(255, n)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    out = `#${to(r)}${to(g)}${to(b)}`;
  }
  if (mods.tint !== undefined) {
    const m = out.replace("#", "");
    const t = mods.tint;
    const r = parseInt(m.slice(0, 2), 16) * t + 255 * (1 - t);
    const g = parseInt(m.slice(2, 4), 16) * t + 255 * (1 - t);
    const b = parseInt(m.slice(4, 6), 16) * t + 255 * (1 - t);
    const to = (n: number) =>
      Math.round(Math.max(0, Math.min(255, n)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    out = `#${to(r)}${to(g)}${to(b)}`;
  }
  return out;
}
