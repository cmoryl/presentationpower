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
import { industrySceneLayers, coreSceneLayers } from "./industry-scene-art";
import { GEOMETRY_SHEET } from "./pack-geometry";
import { INDUSTRY_SKINS } from "./industry-skins";

const SANS = `'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif`;
const SERIF = `'Instrument Serif', Georgia, 'Times New Roman', serif`;
const MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`;

/**
 * APPROVED TYPOGRAPHY SYSTEM — Geist only.
 *
 * The approved OnDeck catalog (S01–S28) runs a single universal type system:
 * Geist for display / body / kicker, Geist Mono ONLY for codes, IDs,
 * coordinates and data annotations. The 28 visual languages differentiate
 * through scale, weight, tracking, case and composition — never through font
 * substitution. Legacy/off-brand packs and the hidden industry signatures keep
 * their historical faces so old references render exactly as before.
 */
export const GEIST = `'Geist Variable', 'Geist', ui-sans-serif, system-ui, -apple-system, sans-serif`;
export const GEIST_MONO = `'Geist Mono Variable', 'Geist Mono', ui-monospace, SFMono-Regular, monospace`;


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
  /** Annotation face — Geist Mono for approved skins, legacy mono otherwise. */
  mono?: string;
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
 * PER-SKIN TRAIT SHEET (approved catalog S01–S28) — GEIST ONLY.
 *
 * Every approved visual language runs Geist for display, body and kicker, with
 * Geist Mono reserved for codes, IDs, coordinates and data annotations. The 28
 * languages stay unmistakably different through their own register:
 * weight (200–800), optical scale, tracking, case, kicker discipline, corner
 * language, card treatment and grain — never through a different typeface.
 */
const SKIN_TRAITS: Record<string, SkinTraits> = {
  // Airy, low-weight, wide kicker — sculptural quiet.
  S01: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 250, displayTracking: "-0.035em", displayTransform: "none", displayScale: 1.06, kickerWeight: 600, kickerTracking: "0.26em", radius: 20, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S02: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 300, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.08, kickerWeight: 500, kickerTracking: "0.2em", radius: 26, surfaceStyle: "glass", topBar: false, grain: 0.04 },
  S03: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 700, displayTracking: "-0.04em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.18em", radius: 14, surfaceStyle: "glass", topBar: true, grain: 0.03 },
  S04: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 600, displayTracking: "-0.012em", displayTransform: "uppercase", displayScale: 0.94, kickerWeight: 500, kickerTracking: "0.32em", radius: 4, surfaceStyle: "outline", topBar: true, grain: 0.05 },
  S05: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 800, displayTracking: "-0.05em", displayTransform: "none", displayScale: 1.02, kickerWeight: 500, kickerTracking: "0.28em", radius: 2, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S06: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 550, displayTracking: "-0.026em", displayTransform: "none", displayScale: 0.98, kickerWeight: 600, kickerTracking: "0.16em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  S07: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 500, displayTracking: "-0.028em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.12em", radius: 22, surfaceStyle: "glass", topBar: false, grain: 0.03 },
  S08: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 750, displayTracking: "-0.034em", displayTransform: "none", displayScale: 1.04, kickerWeight: 700, kickerTracking: "0.1em", radius: 18, surfaceStyle: "raised", topBar: false, grain: 0.03 },
  S09: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 500, displayTracking: "-0.006em", displayTransform: "none", displayScale: 0.92, kickerWeight: 500, kickerTracking: "0.24em", radius: 8, surfaceStyle: "outline", topBar: true, grain: 0.04 },
  S10: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 650, displayTracking: "-0.032em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.15em", radius: 16, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  S11: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 700, displayTracking: "-0.022em", displayTransform: "none", displayScale: 0.98, kickerWeight: 600, kickerTracking: "0.2em", radius: 12, surfaceStyle: "flat", topBar: false, grain: 0.02 },
  S12: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 600, displayTracking: "-0.018em", displayTransform: "none", displayScale: 0.96, kickerWeight: 500, kickerTracking: "0.25em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  S13: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 700, displayTracking: "-0.038em", displayTransform: "none", displayScale: 1.02, kickerWeight: 700, kickerTracking: "0.13em", radius: 20, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  S14: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 700, displayTracking: "-0.045em", displayTransform: "none", displayScale: 1.05, kickerWeight: 700, kickerTracking: "0.3em", radius: 0, surfaceStyle: "flat", topBar: true, grain: 0.01 },
  S15: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 400, displayTracking: "-0.02em", displayTransform: "none", displayScale: 1.1, kickerWeight: 600, kickerTracking: "0.22em", radius: 4, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  S16: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 200, displayTracking: "0.01em", displayTransform: "none", displayScale: 1.16, kickerWeight: 400, kickerTracking: "0.4em", radius: 2, surfaceStyle: "outline", topBar: false, grain: 0.03 },
  S17: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 450, displayTracking: "-0.014em", displayTransform: "none", displayScale: 1.04, kickerWeight: 700, kickerTracking: "0.12em", radius: 24, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  S18: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 800, displayTracking: "-0.03em", displayTransform: "uppercase", displayScale: 1.12, kickerWeight: 600, kickerTracking: "0.3em", radius: 8, surfaceStyle: "glass", topBar: false, grain: 0.06 },
  S19: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 550, displayTracking: "0.014em", displayTransform: "uppercase", displayScale: 0.95, kickerWeight: 500, kickerTracking: "0.34em", radius: 2, surfaceStyle: "outline", topBar: true, grain: 0.03 },
  S20: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 500, displayTracking: "-0.008em", displayTransform: "none", displayScale: 0.93, kickerWeight: 500, kickerTracking: "0.27em", radius: 6, surfaceStyle: "slab", topBar: true, grain: 0.03 },
  S21: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 350, displayTracking: "-0.024em", displayTransform: "none", displayScale: 1.03, kickerWeight: 600, kickerTracking: "0.11em", radius: 28, surfaceStyle: "raised", topBar: false, grain: 0.03 },
  S22: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 600, displayTracking: "-0.016em", displayTransform: "none", displayScale: 1.01, kickerWeight: 400, kickerTracking: "0.24em", radius: 2, surfaceStyle: "paper", topBar: false, grain: 0.06 },
  S23: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 800, displayTracking: "-0.055em", displayTransform: "uppercase", displayScale: 1.08, kickerWeight: 700, kickerTracking: "0.08em", radius: 0, surfaceStyle: "slab", topBar: false, grain: 0.02 },
  S24: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 650, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.05, kickerWeight: 600, kickerTracking: "0.21em", radius: 14, surfaceStyle: "glass", topBar: false, grain: 0.04 },
  S25: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 750, displayTracking: "-0.02em", displayTransform: "uppercase", displayScale: 1.18, kickerWeight: 600, kickerTracking: "0.36em", radius: 4, surfaceStyle: "flat", topBar: true, grain: 0.03 },
  S26: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 600, displayTracking: "-0.031em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.29em", radius: 18, surfaceStyle: "glass", topBar: false, grain: 0.05 },
  S27: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 300, displayTracking: "-0.018em", displayTransform: "none", displayScale: 1.09, kickerWeight: 600, kickerTracking: "0.23em", radius: 30, surfaceStyle: "glass", topBar: false, grain: 0.05 },
  S28: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 500, displayTracking: "-0.026em", displayTransform: "none", displayScale: 0.99, kickerWeight: 500, kickerTracking: "0.17em", radius: 16, surfaceStyle: "slab", topBar: true, grain: 0.03 },
  // Element's product skin: brick-square corners, systematic uppercase kickers.
  S29: { display: GEIST, body: GEIST, kicker: GEIST, mono: GEIST_MONO, displayWeight: 620, displayTracking: "-0.033em", displayTransform: "none", displayScale: 1.03, kickerWeight: 650, kickerTracking: "0.3em", radius: 10, surfaceStyle: "flat", topBar: true, grain: 0.025 },
};


/**
 * PER-INDUSTRY TRAIT SHEET (R01–R30). Each industry signature gets its own
 * reading register: a display/body pairing chosen for that sector, the corner
 * language its material implies, and a card treatment that suits dense,
 * full-information pages rather than airy showcase pages.
 */
const INDUSTRY_TRAITS: Record<string, SkinTraits> = {
  R01: { display: F.archivo, body: F.workSans, kicker: F.archivo, displayWeight: 600, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.18em", radius: 8, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  R02: { display: F.spaceGrotesk, body: F.plex, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.032em", displayTransform: "none", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.26em", radius: 6, surfaceStyle: "outline", topBar: true, grain: 0.04 },
  R03: { display: F.sora, body: F.manrope, kicker: F.spaceMono, displayWeight: 500, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.02, kickerWeight: 500, kickerTracking: "0.3em", radius: 18, surfaceStyle: "glass", topBar: false, grain: 0.05 },
  R04: { display: F.jakarta, body: F.dmSans, kicker: F.spaceMono, displayWeight: 700, displayTracking: "-0.035em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.22em", radius: 12, surfaceStyle: "glass", topBar: true, grain: 0.03 },
  R05: { display: F.baskerville, body: F.karla, kicker: F.karla, displayWeight: 700, displayTracking: "-0.014em", displayTransform: "none", displayScale: 1.04, kickerWeight: 500, kickerTracking: "0.28em", radius: 3, surfaceStyle: "paper", topBar: false, grain: 0.05 },
  R06: { display: F.figtree, body: F.figtree, kicker: F.workSans, displayWeight: 600, displayTracking: "-0.026em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.16em", radius: 10, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  R07: { display: F.tektur, body: F.plex, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.008em", displayTransform: "uppercase", displayScale: 0.95, kickerWeight: 500, kickerTracking: "0.32em", radius: 2, surfaceStyle: "outline", topBar: true, grain: 0.05 },
  R08: { display: F.outfit, body: F.nunito, kicker: F.nunito, displayWeight: 500, displayTracking: "-0.024em", displayTransform: "none", displayScale: 1.02, kickerWeight: 600, kickerTracking: "0.14em", radius: 20, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  R09: { display: F.plex, body: F.plex, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.02em", displayTransform: "none", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.24em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.03 },
  R10: { display: F.cormorant, body: F.karla, kicker: F.spaceMono, displayWeight: 600, displayTracking: "0em", displayTransform: "none", displayScale: 1.1, kickerWeight: 400, kickerTracking: "0.3em", radius: 2, surfaceStyle: "paper", topBar: false, grain: 0.06 },
  R11: { display: F.archivo, body: F.karla, kicker: F.archivo, displayWeight: 700, displayTracking: "-0.036em", displayTransform: "none", displayScale: 1, kickerWeight: 700, kickerTracking: "0.2em", radius: 0, surfaceStyle: "flat", topBar: true, grain: 0.01 },
  R12: { display: F.barlow, body: F.barlow, kicker: F.plexMono, displayWeight: 700, displayTracking: "-0.022em", displayTransform: "uppercase", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.26em", radius: 4, surfaceStyle: "slab", topBar: true, grain: 0.04 },
  R13: { display: F.jura, body: F.manrope, kicker: F.jura, displayWeight: 600, displayTracking: "0.008em", displayTransform: "uppercase", displayScale: 0.97, kickerWeight: 500, kickerTracking: "0.3em", radius: 6, surfaceStyle: "outline", topBar: false, grain: 0.04 },
  R14: { display: F.anton, body: F.barlow, kicker: F.barlow, displayWeight: 400, displayTracking: "-0.018em", displayTransform: "uppercase", displayScale: 1.1, kickerWeight: 600, kickerTracking: "0.3em", radius: 4, surfaceStyle: "flat", topBar: false, grain: 0.05 },
  R15: { display: F.jura, body: F.plex, kicker: F.plexMono, displayWeight: 700, displayTracking: "0.012em", displayTransform: "uppercase", displayScale: 0.95, kickerWeight: 500, kickerTracking: "0.34em", radius: 2, surfaceStyle: "outline", topBar: true, grain: 0.04 },
  R16: { display: F.rubik, body: F.rubik, kicker: F.spaceMono, displayWeight: 600, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1, kickerWeight: 500, kickerTracking: "0.22em", radius: 14, surfaceStyle: "glass", topBar: true, grain: 0.04 },
  R17: { display: F.hind, body: F.hind, kicker: F.plexMono, displayWeight: 600, displayTracking: "-0.02em", displayTransform: "none", displayScale: 0.98, kickerWeight: 500, kickerTracking: "0.26em", radius: 4, surfaceStyle: "slab", topBar: true, grain: 0.03 },
  R18: { display: F.dmSans, body: F.dmSans, kicker: F.dmSans, displayWeight: 700, displayTracking: "-0.034em", displayTransform: "none", displayScale: 1, kickerWeight: 700, kickerTracking: "0.12em", radius: 16, surfaceStyle: "raised", topBar: false, grain: 0.02 },
  R19: { display: F.fraunces, body: F.nunito, kicker: F.nunito, displayWeight: 600, displayTracking: "-0.016em", displayTransform: "none", displayScale: 1.06, kickerWeight: 700, kickerTracking: "0.16em", radius: 22, surfaceStyle: "raised", topBar: false, grain: 0.04 },
  R20: { display: F.cormorant, body: F.karla, kicker: F.karla, displayWeight: 500, displayTracking: "0.006em", displayTransform: "uppercase", displayScale: 1.14, kickerWeight: 400, kickerTracking: "0.4em", radius: 0, surfaceStyle: "outline", topBar: false, grain: 0.03 },
  R21: { display: F.bebas, body: F.barlow, kicker: F.bebas, displayWeight: 400, displayTracking: "0.004em", displayTransform: "uppercase", displayScale: 1.12, kickerWeight: 400, kickerTracking: "0.3em", radius: 6, surfaceStyle: "flat", topBar: false, grain: 0.05 },
  R22: { display: F.tektur, body: F.rubik, kicker: F.spaceMono, displayWeight: 700, displayTracking: "-0.012em", displayTransform: "uppercase", displayScale: 1, kickerWeight: 500, kickerTracking: "0.28em", radius: 10, surfaceStyle: "glass", topBar: true, grain: 0.06 },
  R23: { display: F.archivoBlack, body: F.barlow, kicker: F.archivoBlack, displayWeight: 400, displayTracking: "-0.04em", displayTransform: "uppercase", displayScale: 1.06, kickerWeight: 400, kickerTracking: "0.1em", radius: 0, surfaceStyle: "slab", topBar: false, grain: 0.03 },
  R24: { display: F.lora, body: F.nunito, kicker: F.nunito, displayWeight: 500, displayTracking: "-0.012em", displayTransform: "none", displayScale: 1.05, kickerWeight: 600, kickerTracking: "0.18em", radius: 24, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  R25: { display: F.oswald, body: F.workSans, kicker: F.workSans, displayWeight: 300, displayTracking: "-0.008em", displayTransform: "uppercase", displayScale: 1.06, kickerWeight: 600, kickerTracking: "0.3em", radius: 2, surfaceStyle: "paper", topBar: false, grain: 0.04 },
  R26: { display: F.lora, body: F.workSans, kicker: F.spaceMono, displayWeight: 600, displayTracking: "-0.014em", displayTransform: "none", displayScale: 1.03, kickerWeight: 500, kickerTracking: "0.24em", radius: 4, surfaceStyle: "paper", topBar: true, grain: 0.05 },
  R27: { display: F.archivo, body: F.hind, kicker: F.archivo, displayWeight: 600, displayTracking: "-0.028em", displayTransform: "none", displayScale: 1, kickerWeight: 600, kickerTracking: "0.2em", radius: 6, surfaceStyle: "flat", topBar: true, grain: 0.02 },
  R28: { display: F.fraunces, body: F.workSans, kicker: F.workSans, displayWeight: 500, displayTracking: "-0.012em", displayTransform: "none", displayScale: 1.04, kickerWeight: 600, kickerTracking: "0.22em", radius: 8, surfaceStyle: "paper", topBar: false, grain: 0.05 },
  R29: { display: F.jakarta, body: F.figtree, kicker: F.figtree, displayWeight: 600, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.02, kickerWeight: 600, kickerTracking: "0.14em", radius: 26, surfaceStyle: "raised", topBar: false, grain: 0.03 },
  R30: { display: F.syne, body: F.manrope, kicker: F.syne, displayWeight: 700, displayTracking: "-0.03em", displayTransform: "none", displayScale: 1.04, kickerWeight: 600, kickerTracking: "0.24em", radius: 18, surfaceStyle: "glass", topBar: false, grain: 0.05 },
};


function traitsFor(skin: DesignSkin): SkinTraits | null {
  const code = (skin.code ?? "").toUpperCase();
  return SKIN_TRAITS[code] ?? INDUSTRY_TRAITS[code] ?? null;
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
      mono: tr.mono ?? MONO,

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
  // ACCENT LOCK — different scenes lean on `accentAlt` to different degrees, so
  // hand-picking a background section per slide used to shift the perceived
  // accent from slide to slide. When the seed carries `accentlock` the secondary
  // accent is pulled most of the way to the signature accent, so every picked
  // background reads in the same colour while keeping its own composition.
  const lock = /accentlock/i.test(seed);
  // An alternate take is encoded as `take:<n>`. Takes are different
  // COMPOSITIONS of the same language, never a different design.
  const takeMatch = /take:(\d+)/i.exec(seed);
  const take = takeMatch ? parseInt(takeMatch[1]!, 10) : 0;
  const scene = sceneFromSeed(seed);
  // AUTHORED SCENE ART first; the procedural engine is the underlay. Industry
  // recipes (R01–R30) carry their own authored colour story; the 28 core
  // languages get the same authored geometry rendered in THEIR palette.
  const art = /^R\d{2}$/.test(skin.code)
    ? industrySceneLayers(skin.code, scene, take)
    : coreSceneLayers(skin.code, scene, {
        surface: r.surface,
        ink: r.ink,
        accent: r.accent,
        accentAlt: lock ? mix(r.accentAlt, r.accent, 0.75) : r.accentAlt,
        dark: r.dark,
      }, take);

  return [
    ...art,
    ...skinBackgroundLayers(
    skin,
    scene,
    {
      surface: r.surface,
      ink: r.ink,
      accent: r.accent,
      accentAlt: lock ? mix(r.accentAlt, r.accent, 0.75) : r.accentAlt,
      dark: r.dark,
    },
    take,
  )];
}


/** Stable pack id for a catalog skin, e.g. "skin-s01". */
export function skinPackId(code: string): string {
  return `skin-${code.toLowerCase()}`;
}

export function isSkinPackId(id: string | null | undefined): boolean {
  return Boolean(id && /^skin-[sr]\d{2}$/i.test(id));
}

export function skinCodeFromPackId(id: string): string {
  return id.replace(/^skin-/i, "").toUpperCase();
}

/** Translate a catalog visual language into a renderable style pack. */
/**
 * Render options. `contrast: "high"` is a REAL render mode, not a label: the
 * palette is re-resolved so ink sits at the luminance extreme against the page
 * field, accents are pushed until they clear the field, hairlines harden and
 * decorative grain is dropped. When a skin ships an explicit `hc` block from
 * the sheet, those stops win; otherwise high contrast is derived, so every one
 * of the 28 languages has a working high-contrast rendering.
 */
export interface SkinRenderOptions {
  contrast?: "normal" | "high";
}

function highContrastRoles(skin: DesignSkin, r: ReturnType<typeof roles>) {
  if (skin.hc) {
    const dark = luminance(skin.hc.surface) < 0.5;
    return {
      surface: skin.hc.surface,
      ink: skin.hc.ink,
      accent: skin.hc.accent,
      accentAlt: skin.hc.accent,
      dark,
    };
  }
  const dark = luminance(r.surface) < 0.5;
  const ink = dark ? "#FFFFFF" : "#000000";
  // Keep the language's hue, but drag it until it clearly clears the field.
  const lift = (hex: string) =>
    Math.abs(luminance(hex) - luminance(r.surface)) < 0.45
      ? mix(hex, ink, 0.55)
      : hex;
  return { surface: r.surface, ink, accent: lift(r.accent), accentAlt: lift(r.accentAlt), dark };
}

export function stylePackFromSkin(skin: DesignSkin, opts?: SkinRenderOptions): StylePack {
  const hc = opts?.contrast === "high";
  const base = roles(skin);
  const r = hc ? highContrastRoles(skin, base) : base;
  const inkMuted = hc ? r.ink : r.dark ? rgba(r.ink, 0.72) : mix(r.ink, r.surface, 0.32);
  const inkFaint = hc
    ? r.dark
      ? rgba(r.ink, 0.82)
      : mix(r.ink, r.surface, 0.2)
    : r.dark
      ? rgba(r.ink, 0.48)
      : mix(r.ink, r.surface, 0.55);
  const accentText = hc
    ? r.accent
    : Math.abs(luminance(r.accent) - luminance(r.surface)) < 0.35
      ? mix(r.accent, r.ink, 0.4)
      : r.accent;
  const tr = traitsFor(skin);
  const geo = GEOMETRY_SHEET[(skin.code ?? "").toUpperCase()];
  const dense = tr ? tr.topBar : /high/i.test(skin.density);
  const card = { ...cardFor(skin, r), shape: geo?.shape };

  return {
    id: skinPackId(skin.code) as StylePack["id"],
    label: `${skin.name}`,
    tagline: skin.description,
    reference: skin.reference,
    mode: hc ? (r.dark ? "dark" : "light") : skin.mode,
    tokens: {
      surface: r.surface,
      ink: r.ink,
      inkMuted,
      inkFaint,
      accent: r.accent,
      accentText,
      accentAlt: r.accentAlt,
      primary: accentText,
      hairline: rgba(r.ink, hc ? (r.dark ? 0.5 : 0.42) : r.dark ? 0.16 : 0.12),
    },
    // High contrast never hides content behind glass: surfaces go opaque with a
    // hard border so every plate edge is visible to low-vision readers.
    card: hc
      ? {
          ...card,
          bg: r.dark ? mix(r.surface, r.ink, 0.1) : "#FFFFFF",
          border: `2px solid ${rgba(r.ink, 0.9)}`,
          shadow: "none",
          blur: "none",
        }
      : card,
    layout: geo?.layout,
    geometry: geo,
    type: typeFor(skin),
    topBar: dense,
    grain: hc ? 0 : tr ? tr.grain + (r.dark ? 0.01 : 0) : r.dark ? 0.04 : 0.03,
    ground: (seed) => groundFor(skin, r, hc ? `${seed} hc` : seed),
    swatch: [r.surface, r.ink, r.accent, r.accentAlt],
  };
}

/** High-contrast rendering of one catalog skin, for the a11y preview mode. */
export function highContrastPackFromSkin(skin: DesignSkin): StylePack {
  return stylePackFromSkin(skin, { contrast: "high" });
}


/** Every catalog skin as a renderable pack, in catalog order. */
export const SKIN_PACKS: StylePack[] = DESIGN_SKINS.map((s) => stylePackFromSkin(s));

/**
 * The 30 curated industry signatures (R01–R30) as renderable packs. They share
 * the catalog pipeline but carry their own palette, motif, geometry and type
 * pairing, tuned for dense full-information decks.
 */
export const INDUSTRY_PACKS: StylePack[] = INDUSTRY_SKINS.map((s) => stylePackFromSkin(s));

/** Every hand-authored language: catalog first, industry signatures after. */
export const ALL_SKIN_PACKS: StylePack[] = [...SKIN_PACKS, ...INDUSTRY_PACKS];

export function skinPackById(id: string | null | undefined): StylePack | null {
  if (!isSkinPackId(id)) return null;
  return ALL_SKIN_PACKS.find((p) => p.id === id) ?? null;
}
