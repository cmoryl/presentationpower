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

import type { StylePack } from "./style-packs";
import { DESIGN_SKINS, type DesignSkin } from "./design-skins";
import { skinBackgroundLayers, sceneFromSeed } from "./skin-backgrounds";

const SANS = `'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif`;
const SERIF = `'Instrument Serif', Georgia, 'Times New Roman', serif`;
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`;

/** Loaded web faces, wrapped with sane fallbacks. */
const F = {
  sora: `'Sora', ${SANS}`,
  outfit: `'Outfit', ${SANS}`,
  spaceGrotesk: `'Space Grotesk', ${SANS}`,
  tektur: `'Tektur', ${SANS}`,
  plex: `'IBM Plex Sans', ${SANS}`,
  plexMono: `'IBM Plex Mono', ${MONO}`,
  archivo: `'Archivo', ${SANS}`,
  archivoBlack: `'Archivo Black', 'Archivo', ${SANS}`,
  figtree: `'Figtree', ${SANS}`,
  rubik: `'Rubik', ${SANS}`,
  jbMono: MONO,
  spaceMono: `'Space Mono', ${MONO}`,
  jakarta: `'Plus Jakarta Sans', ${SANS}`,
  barlow: `'Barlow', ${SANS}`,
  hind: `'Hind', ${SANS}`,
  dmSans: `'DM Sans', ${SANS}`,
  fraunces: `'Fraunces', ${SERIF}`,
  cormorant: `'Cormorant Garamond', ${SERIF}`,
  lora: `'Lora', ${SERIF}`,
  nunito: `'Nunito Sans', ${SANS}`,
  anton: `'Anton', ${SANS}`,
  jura: `'Jura', ${SANS}`,
  baskerville: `'Libre Baskerville', ${SERIF}`,
  syne: `'Syne', ${SANS}`,
  bebas: `'Bebas Neue', ${SANS}`,
  manrope: `'Manrope', ${SANS}`,
  workSans: `'Work Sans', ${SANS}`,
  oswald: `'Oswald', ${SANS}`,
  karla: `'Karla', ${SANS}`,
} as const;

type SurfaceStyle = "glass" | "flat" | "paper" | "outline" | "raised" | "slab";

interface SkinTraits {
  display: string;
  body: string;
  kicker: string;
  displayWeight: number;
  displayTracking: string;
  displayTransform: "none" | "uppercase";
  displayScale: number;
  kickerWeight: number;
  kickerTracking: string;
  radius: number;
  surfaceStyle: SurfaceStyle;
  topBar: boolean;
  grain: number;
}

/**
 * PER-SKIN TRAIT SHEET. Every catalog visual language gets its own type pairing,
 * headline register, corner language and card treatment — so no two skins share
 * a full property set, and each pairs with its own background motif family.
 */
const SKIN_TRAITS: Record<string, SkinTraits> = {
  S01: { display: F.sora, body: F.manrope, kicker: F.manrope, displayWeight: 300, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.02, kickerWeight: 600, kickerTracking: "0.22em", radius: 20, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S02: { display: F.outfit, body: F.figtree, kicker: F.figtree, displayWeight: 300, displayTracking: "-0.025em", displayTransform: "none", displayScale: 1.04, kickerWeight: 600, kickerTracking: "0.18em", radius: 26, surfaceStyle: "glass", topBar: false, grain: 0.04 },
  S03: { display: F.spaceGrotesk, body: F.dmSans, kicker: F.spaceMono, displayWeight: 700, displayTracking: "-0.035em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.2em", radius: 14, surfaceStyle: "glass", topBar: true, grain: 0.03 },
  S04: { display: F.tektur, body: F.plex, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.01em", displayTransform: "uppercase", displayScale: 0.96, kickerWeight: 500, kickerTracking: "0.3em", radius: 4, surfaceStyle: "outline", topBar: true, grain: 0.05 },
  S05: { display: F.plex, body: F.plex, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.02em", displayTransform: "none", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.26em", radius: 2, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S06: { display: F.archivo, body: F.workSans, kicker: F.archivo, displayWeight: 600, displayTracking: "-0.028em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.16em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  S07: { display: F.figtree, body: F.figtree, kicker: F.figtree, displayWeight: 600, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.14em", radius: 22, surfaceStyle: "glass", topBar: false, grain: 0.03 },
  S08: { display: F.rubik, body: F.rubik, kicker: F.rubik, displayWeight: 700, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 700, kickerTracking: "0.12em", radius: 18, surfaceStyle: "raised", topBar: false, grain: 0.03 },
  S09: { display: F.jbMono, body: F.plex, kicker: F.jbMono, displayWeight: 500, displayTracking: "-0.02em", displayTransform: "none", displayScale: 0.94, kickerWeight: 500, kickerTracking: "0.24em", radius: 8, surfaceStyle: "outline", topBar: true, grain: 0.04 },
  S10: { display: F.jakarta, body: F.jakarta, kicker: F.jakarta, displayWeight: 700, displayTracking: "-0.032em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.16em", radius: 16, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  S11: { display: F.barlow, body: F.barlow, kicker: F.barlow, displayWeight: 700, displayTracking: "-0.025em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.2em", radius: 12, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S12: { display: F.hind, body: F.hind, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.02em", displayTransform: "none", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.24em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  S13: { display: F.dmSans, body: F.dmSans, kicker: F.dmSans, displayWeight: 700, displayTracking: "-0.035em", displayTransform: "none", displayScale: 1, kickerWeight: 700, kickerTracking: "0.14em", radius: 20, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  S14: { display: F.archivo, body: F.karla, kicker: F.archivo, displayWeight: 700, displayTracking: "-0.04em", displayTransform: "none", displayScale: 1, kickerWeight: 700, kickerTracking: "0.28em", radius: 0, surfaceStyle: "flat", topBar: true, grain: 0.01 },
  S15: { display: F.fraunces, body: F.workSans, kicker: F.workSans, displayWeight: 600, displayTracking: "-0.018em", displayTransform: "none", displayScale: 1.06, kickerWeight: 600, kickerTracking: "0.22em", radius: 4, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  S16: { display: F.cormorant, body: F.karla, kicker: F.karla, displayWeight: 500, displayTracking: "0.005em", displayTransform: "none", displayScale: 1.12, kickerWeight: 400, kickerTracking: "0.36em", radius: 2, surfaceStyle: "outline", topBar: false, grain: 0.03 },
  S17: { display: F.lora, body: F.nunito, kicker: F.nunito, displayWeight: 500, displayTracking: "-0.01em", displayTransform: "none", displayScale: 1.04, kickerWeight: 700, kickerTracking: "0.14em", radius: 24, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  S18: { display: F.anton, body: F.barlow, kicker: F.barlow, displayWeight: 400, displayTracking: "-0.02em", displayTransform: "uppercase", displayScale: 1.08, kickerWeight: 600, kickerTracking: "0.3em", radius: 8, surfaceStyle: "glass", topBar: false, grain: 0.06 },
  S19: { display: F.jura, body: F.plex, kicker: F.jura, displayWeight: 600, displayTracking: "0.01em", displayTransform: "uppercase", displayScale: 0.96, kickerWeight: 500, kickerTracking: "0.32em", radius: 2, surfaceStyle: "outline", topBar: true, grain: 0.03 },
  S20: { display: F.plexMono, body: F.plex, kicker: F.plexMono, displayWeight: 500, displayTracking: "-0.01em", displayTransform: "none", displayScale: 0.94, kickerWeight: 500, kickerTracking: "0.26em", radius: 6, surfaceStyle: "slab", topBar: true, grain: 0.03 },
  S21: { display: F.outfit, body: F.nunito, kicker: F.nunito, displayWeight: 400, displayTracking: "-0.02em", displayTransform: "none", displayScale: 1.02, kickerWeight: 600, kickerTracking: "0.12em", radius: 28, surfaceStyle: "raised", topBar: false, grain: 0.03 },
  S22: { display: F.baskerville, body: F.karla, kicker: F.spaceMono, displayWeight: 700, displayTracking: "-0.012em", displayTransform: "none", displayScale: 1.02, kickerWeight: 400, kickerTracking: "0.24em", radius: 2, surfaceStyle: "paper", topBar: false, grain: 0.06 },
  S23: { display: F.archivoBlack, body: F.archivo, kicker: F.archivoBlack, displayWeight: 400, displayTracking: "-0.045em", displayTransform: "uppercase", displayScale: 1.05, kickerWeight: 400, kickerTracking: "0.1em", radius: 0, surfaceStyle: "slab", topBar: false, grain: 0.02 },
  S24: { display: F.syne, body: F.jakarta, kicker: F.syne, displayWeight: 700, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.2em", radius: 14, surfaceStyle: "glass", topBar: false, grain: 0.04 },
  S25: { display: F.bebas, body: F.barlow, kicker: F.bebas, displayWeight: 400, displayTracking: "0.005em", displayTransform: "uppercase", displayScale: 1.14, kickerWeight: 400, kickerTracking: "0.34em", radius: 4, surfaceStyle: "flat", topBar: true, grain: 0.03 },
  S26: { display: F.sora, body: F.manrope, kicker: F.spaceMono, displayWeight: 600, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.28em", radius: 18, surfaceStyle: "glass", topBar: false, grain: 0.05 },
  S27: { display: F.oswald, body: F.manrope, kicker: F.manrope, displayWeight: 300, displayTracking: "-0.01em", displayTransform: "none", displayScale: 1.06, kickerWeight: 600, kickerTracking: "0.24em", radius: 30, surfaceStyle: "glass", topBar: false, grain: 0.05 },
  S28: { display: F.spaceGrotesk, body: F.workSans, kicker: F.spaceMono, displayWeight: 500, displayTracking: "-0.028em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.18em", radius: 16, surfaceStyle: "slab", topBar: true, grain: 0.03 },
};

function traitsFor(skin: DesignSkin): SkinTraits | null {
  return SKIN_TRAITS[(skin.code ?? "").toUpperCase()] ?? null;
}


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
  const tr = traitsFor(skin);
  if (tr) {
    return {
      display: tr.display,
      body: tr.body,
      mono: MONO,
      displayWeight: tr.displayWeight,
      displayTracking: tr.displayTracking,
      displayTransform: tr.displayTransform,
      displayScale: tr.displayScale,
      kicker: tr.kicker,
      kickerWeight: tr.kickerWeight,
      kickerTracking: tr.kickerTracking,
    };
  }
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
  const tr = traitsFor(skin);
  const inkLine = rgba(r.ink, r.dark ? 0.18 : 0.12);
  const style: SurfaceStyle =
    tr?.surfaceStyle ??
    (/glass|acrylic|translucent|aura|atmospher|liquid/.test(note)
      ? "glass"
      : /paper|documentary|press|linen/.test(note)
        ? "paper"
        : "flat");
  const radius =
    tr?.radius ??
    (/hard|grid|precise|strict|minimal radius|plane/.test(note)
      ? 2
      : /soft|round|flexible|organic|friendly/.test(note)
        ? 18
        : 10);

  switch (style) {
    case "glass":
      return {
        bg: r.dark ? rgba(r.ink, 0.07) : rgba("#FFFFFF", 0.55),
        border: `1px solid ${rgba(r.dark ? r.accent : r.ink, r.dark ? 0.26 : 0.1)}`,
        radius,
        shadow: `0 18px 48px ${rgba(r.dark ? "#000000" : r.ink, r.dark ? 0.45 : 0.1)}`,
        blur: "blur(18px) saturate(140%)",
      };
    case "outline":
      return {
        bg: r.dark ? rgba(r.ink, 0.03) : rgba("#FFFFFF", 0.72),
        border: `1px solid ${rgba(r.accent, r.dark ? 0.42 : 0.34)}`,
        radius,
        shadow: "none",
        blur: "none",
      };
    case "raised":
      return {
        bg: r.dark ? mix(r.surface, r.ink, 0.1) : "#FFFFFF",
        border: `1px solid ${rgba(r.ink, r.dark ? 0.14 : 0.06)}`,
        radius,
        shadow: r.dark
          ? `0 22px 44px ${rgba("#000000", 0.5)}`
          : `0 18px 38px ${rgba(r.ink, 0.14)}`,
        blur: "none",
      };
    case "slab":
      return {
        bg: r.dark ? mix(r.surface, r.ink, 0.14) : mix(r.surface, r.ink, 0.05),
        border: `2px solid ${rgba(r.ink, r.dark ? 0.4 : 0.85)}`,
        radius,
        shadow: r.dark ? "none" : `6px 6px 0 ${rgba(r.ink, 0.9)}`,
        blur: "none",
      };
    case "paper":
      return {
        bg: r.dark ? mix(r.surface, r.ink, 0.07) : mix(r.surface, "#FFFFFF", 0.7),
        border: `1px solid ${rgba(r.ink, r.dark ? 0.16 : 0.14)}`,
        radius,
        shadow: r.dark ? "none" : `0 2px 0 ${rgba(r.ink, 0.06)}`,
        blur: "none",
      };
    default:
      return {
        bg: r.dark ? mix(r.surface, r.ink, 0.08) : "#FFFFFF",
        border: `1px solid ${inkLine}`,
        radius,
        shadow: r.dark ? "none" : `0 8px 24px ${rgba(r.ink, 0.08)}`,
        blur: "none",
      };
  }
}


function groundFor(skin: DesignSkin, r: ReturnType<typeof roles>, seed: string): string[] {
  return skinBackgroundLayers(skin, sceneFromSeed(seed), {
    surface: r.surface,
    ink: r.ink,
    accent: r.accent,
    accentAlt: r.accentAlt,
    dark: r.dark,
  });
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
  const tr = traitsFor(skin);
  const dense = tr ? tr.topBar : /high/i.test(skin.density);

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
    grain: tr ? tr.grain + (r.dark ? 0.01 : 0) : r.dark ? 0.04 : 0.03,
    ground: (seed) => groundFor(skin, r, seed),
    swatch: [r.surface, r.ink, r.accent, r.accentAlt],
  };
}

/** Every catalog skin as a renderable pack, in catalog order. */
export const SKIN_PACKS: StylePack[] = DESIGN_SKINS.map(stylePackFromSkin);

export function skinPackById(id: string | null | undefined): StylePack | null {
  if (!isSkinPackId(id)) return null;
  return SKIN_PACKS.find((p) => p.id === id) ?? null;
}
