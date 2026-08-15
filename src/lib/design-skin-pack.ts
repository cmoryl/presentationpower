/**
 * DESIGN SKIN → STYLE PACK adapter.
 *
 * The renderer already knows how to dress every module from a `StylePack`
 * (tokens + card + type + ground published as CSS custom properties). Rather
 * than fork that pipeline for the OnDeck skin catalog, each catalog visual
 * language is translated into a pack on demand, so all 28 skins render through
 * the exact same primitives, previews and export paths as the built-in packs.
 *
 * The translation is deterministic and driven by the catalog's own fields:
 *   • palette      → surface / ink / accents
 *   • surfaceNote  → card treatment (glass, flat plane, paper, grid)
 *   • typography   → display weight, case and tracking character
 *   • density      → corner radius and ground busyness
 */

import type { StylePack } from "@/lib/style-packs";
import { DESIGN_SKINS, type DesignSkin } from "@/lib/design-skins";

const SANS = `'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif`;
const SERIF = `'Instrument Serif', Georgia, 'Times New Roman', serif`;
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`;

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function mix(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const x = parseInt(pa.slice(i, i + 2), 16);
    const y = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/**
 * Resolve the palette into named roles. The sheets print the page field first
 * and the reading ink second for light skins; dark skins print their deepest
 * field first with the accents following, so roles are chosen by luminance
 * rather than by position.
 */
function roles(skin: DesignSkin) {
  const pal = skin.palette;
  const dark = skin.mode === "dark";
  const surface = pal[0]!;
  const sorted = [...pal.slice(1)].sort((x, y) => luminance(y) - luminance(x));
  const ink = dark ? (sorted[0] ?? "#FFFFFF") : (sorted[sorted.length - 1] ?? "#111111");
  // Accents: the most saturated remaining stops with usable contrast.
  const rest = pal.slice(1).filter((c) => c !== ink);
  const contrasty = rest
    .map((c) => ({ c, d: Math.abs(luminance(c) - luminance(surface)) }))
    .sort((a, b) => b.d - a.d);
  const accent = (dark ? rest[0] : contrasty[0]?.c) ?? ink;
  const accentAlt = rest.find((c) => c !== accent) ?? accent;
  return { surface, ink, accent, accentAlt, dark };
}

function typeFor(skin: DesignSkin) {
  const t = `${skin.typography} ${skin.name}`.toLowerCase();
  const editorial = /editorial|serif|luxury|gallery|documentary|humanist/.test(t);
  const mono = /mono|code|compact|technical|developer/.test(t);
  const bold = /bold|expressive|impact|kinetic|brutal/.test(t);
  return {
    display: editorial ? SERIF : SANS,
    body: SANS,
    mono: MONO,
    displayWeight: editorial ? 400 : bold ? 700 : 600,
    displayTracking: editorial ? "-0.02em" : bold ? "-0.035em" : "-0.03em",
    displayTransform: (bold && /brutal|kinetic/.test(t) ? "uppercase" : "none") as
      | "none"
      | "uppercase",
    displayScale: editorial ? 1.06 : 1,
    kicker: mono ? MONO : SANS,
    kickerWeight: 600,
    kickerTracking: "0.2em",
  };
}

function cardFor(skin: DesignSkin, r: ReturnType<typeof roles>) {
  const note = `${skin.surfaceNote} ${skin.name}`.toLowerCase();
  const glass = /glass|acrylic|translucent|aura|atmospher|liquid/.test(note);
  const hard = /hard|grid|precise|strict|minimal radius|plane/.test(note);
  const paper = /paper|documentary|press|linen/.test(note);
  const radius = hard ? 2 : /soft|round|flexible|organic|friendly/.test(note) ? 18 : 10;
  const inkLine = rgba(r.ink, r.dark ? 0.18 : 0.12);
  if (glass) {
    return {
      bg: r.dark ? rgba(r.ink, 0.06) : rgba("#FFFFFF", 0.55),
      border: `1px solid ${rgba(r.dark ? r.accent : r.ink, r.dark ? 0.24 : 0.1)}`,
      radius: Math.max(radius, 14),
      shadow: `0 18px 48px ${rgba(r.dark ? "#000000" : r.ink, r.dark ? 0.45 : 0.1)}`,
      blur: "blur(18px) saturate(140%)",
    };
  }
  return {
    bg: r.dark ? mix(r.surface, r.ink, 0.08) : paper ? mix(r.surface, "#FFFFFF", 0.6) : "#FFFFFF",
    border: `1px solid ${inkLine}`,
    radius,
    shadow: r.dark ? "none" : `0 8px 24px ${rgba(r.ink, paper ? 0.05 : 0.08)}`,
    blur: "none",
  };
}

function groundFor(skin: DesignSkin, r: ReturnType<typeof roles>): string[] {
  const note = `${skin.surfaceNote} ${skin.imagery} ${skin.name}`.toLowerCase();
  const layers: string[] = [];
  const wash = (at: string, hex: string, a: number, w = 70, h = 70) =>
    `radial-gradient(${w}% ${h}% at ${at}, ${rgba(hex, a)} 0%, ${rgba(hex, 0)} 72%)`;

  if (/mesh|gradient|aura|luminous|atmospher|liquid|cinematic/.test(note)) {
    layers.push(wash("18% 12%", r.accent, r.dark ? 0.38 : 0.16));
    layers.push(wash("86% 78%", r.accentAlt, r.dark ? 0.3 : 0.14, 80, 80));
  } else if (/grid|blueprint|strict|rational|architect|precise/.test(note)) {
    const line = rgba(r.ink, r.dark ? 0.1 : 0.06);
    layers.push(
      `repeating-linear-gradient(90deg, ${line} 0px, ${line} 1px, transparent 1px, transparent 88px)`,
    );
    layers.push(
      `repeating-linear-gradient(0deg, ${line} 0px, ${line} 1px, transparent 1px, transparent 88px)`,
    );
    layers.push(wash("88% 6%", r.accent, r.dark ? 0.22 : 0.1));
  } else if (/mosaic|bento|modular|layered/.test(note)) {
    layers.push(
      `linear-gradient(${rgba(r.accent, r.dark ? 0.16 : 0.08)}, ${rgba(r.accent, 0)}) right top / 42% 46% no-repeat`,
    );
    layers.push(wash("10% 88%", r.accentAlt, r.dark ? 0.24 : 0.1));
  } else {
    layers.push(wash("76% 14%", r.accent, r.dark ? 0.24 : 0.09));
  }
  layers.push(`linear-gradient(${r.surface}, ${r.surface})`);
  return layers;
}

/** Stable pack id for a catalog skin, e.g. "skin-s01". */
export function skinPackId(code: string): string {
  return `skin-${code.toLowerCase()}`;
}

export function isSkinPackId(id: string | null | undefined): boolean {
  return Boolean(id && /^skin-s\d{2}$/i.test(id));
}

export function skinCodeFromPackId(id: string): string {
  return id.replace(/^skin-/i, "").toUpperCase();
}

/** Translate a catalog visual language into a renderable style pack. */
export function stylePackFromSkin(skin: DesignSkin): StylePack {
  const r = roles(skin);
  const inkMuted = r.dark ? rgba(r.ink, 0.72) : mix(r.ink, r.surface, 0.32);
  const inkFaint = r.dark ? rgba(r.ink, 0.48) : mix(r.ink, r.surface, 0.55);
  const accentText =
    Math.abs(luminance(r.accent) - luminance(r.surface)) < 0.35
      ? mix(r.accent, r.ink, 0.4)
      : r.accent;
  const dense = /high/i.test(skin.density);
  return {
    id: skinPackId(skin.code) as StylePack["id"],
    label: `${skin.name}`,
    tagline: skin.description,
    reference: skin.reference,
    mode: skin.mode,
    tokens: {
      surface: r.surface,
      ink: r.ink,
      inkMuted,
      inkFaint,
      accent: r.accent,
      accentText,
      accentAlt: r.accentAlt,
      primary: accentText,
      hairline: rgba(r.ink, r.dark ? 0.16 : 0.12),
    },
    card: cardFor(skin, r),
    type: typeFor(skin),
    topBar: dense,
    grain: r.dark ? 0.04 : 0.03,
    ground: () => groundFor(skin, r),
    swatch: [r.surface, r.ink, r.accent, r.accentAlt],
  };
}

/** Every catalog skin as a renderable pack, in catalog order. */
export const SKIN_PACKS: StylePack[] = DESIGN_SKINS.map(stylePackFromSkin);

export function skinPackById(id: string | null | undefined): StylePack | null {
  if (!isSkinPackId(id)) return null;
  return SKIN_PACKS.find((p) => p.id === id) ?? null;
}
