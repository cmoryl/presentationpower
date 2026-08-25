/**
 * INDUSTRY BACKGROUND SETS — R01–R30.
 *
 * The approved visual languages (S01–S28) stay the only selectable *styles*.
 * This module exposes the thirty industry recipes as authored BACKGROUND
 * SYSTEMS: each recipe has its own art-directed signature in
 * `skin-backgrounds.ts` (rake, weight, texture, anchor, ratio, content-safe
 * bias, signal emphasis) so no sector inherits the neutral fallback.
 *
 * Every set is 11 scene roles × 4 takes = 44 deterministic compositions, in
 * four usage families:
 *
 *   HERO     cover / statement / closing
 *   CONTENT  agenda / split / quote / section
 *   DATA     stats / chart
 *   FLOW     timeline / bento
 *
 * Nothing is rasterised here: compositions are rendered on demand through the
 * same `pack.ground(seed)` contract the slide stage and the PPTX/PDF/PNG
 * exporters already use, so screen and export stay identical.
 */

import {
  DESIGN_SKINS,
  INDUSTRY_RECIPES,
  type DesignSkin,
  type IndustryRecipe,
} from "./design-skins";
import { INDUSTRY_SKINS, industrySkinByCode } from "./industry-skins";
import { skinPackById, skinPackId, stylePackFromSkin } from "./design-skin-pack";
import { tonedIndustrySceneLayers } from "./industry-scene-art";
import type { StylePack } from "./style-packs";
import {
  MOTIF_LABEL,
  SKIN_BG_TAKES,
  SKIN_SCENES,
  TAKE_LABEL,
  motifFamilyFor,
  sceneFromSeed,
  skinSignature,
  type MotifFamily,
  type SceneTier,
  type SkinScene,
  type SkinSignature,
} from "./skin-backgrounds";

export type IndustryBgFamilyKey = SceneTier;

export interface IndustryBgFamily {
  key: IndustryBgFamilyKey;
  label: string;
  /** Scene roles that belong to this usage family. */
  scenes: SkinScene[];
  /** The one scene shown as the family's 16:9 representative preview. */
  representative: SkinScene;
  /** Approved loudness band, for the UI caption. */
  band: string;
  note: string;
}

/** The four usage families, in intensity order. */
export const INDUSTRY_BG_FAMILIES: IndustryBgFamily[] = [
  {
    key: "hero",
    label: "Hero",
    scenes: ["cover", "statement", "closing"],
    representative: "cover",
    band: "0.72–0.90",
    note: "Cover, statement and closing — strongest field, headline zone kept clear.",
  },
  {
    key: "content",
    label: "Content",
    scenes: ["agenda", "split", "quote", "section"],
    representative: "agenda",
    band: "0.28–0.48",
    note: "Agenda, split, quote and section — 55–70% calm reading field.",
  },
  {
    key: "data",
    label: "Data",
    scenes: ["stats", "chart"],
    representative: "stats",
    band: "0.20–0.34",
    note: "Stat walls and charts — quietest register so figures always win.",
  },
  {
    key: "flow",
    label: "Flow",
    scenes: ["timeline", "bento"],
    representative: "timeline",
    band: "0.30–0.40",
    note: "Timelines and bento grids — structured rhythm under the modules.",
  },
];

/** The ground() seed for one scene + take. Same contract as the slide stage. */
export function industryBgSeed(scene: SkinScene, take = 0): string {
  return `scene:${scene} take:${((take % SKIN_BG_TAKES) + SKIN_BG_TAKES) % SKIN_BG_TAKES}`;
}

export interface IndustryBgComposition {
  scene: SkinScene;
  take: number;
  takeLabel: string;
  seed: string;
}

export interface IndustryBackgroundSet {
  /** Recipe id, R01–R30. */
  recipeId: string;
  /** `skin-r01` … `skin-r30` — the industry background skin's pack id. */
  packId: string;
  name: string;
  recipe: IndustryRecipe;
  skin: DesignSkin;
  motif: MotifFamily;
  motifLabel: string;
  signature: SkinSignature;
  palette: string[];
  mode: "light" | "dark";
  families: IndustryBgFamily[];
  /** All 44 scene × take compositions, rendered on demand. */
  compositions: IndustryBgComposition[];
  /** Renderable pack for this industry background system. */
  pack: StylePack;
  /** CSS background layers for one composition, topmost first. */
  layers: (scene: SkinScene, take?: number) => string[];
}

function buildSet(skin: DesignSkin): IndustryBackgroundSet {
  const recipe: IndustryRecipe = INDUSTRY_RECIPES.find((r) => r.id === skin.code) ??
    // Core language (S01–S28): synthesise the same descriptor shape from the
    // catalog entry so one gallery can list core and sector systems together.
    {
      id: skin.code,
      name: skin.name,
      summary: skin.description,
      dna: [skin.name],
      presets: [],
      profile: skin.reference,
      tone: skin.bestFit,
      palette: skin.palette,
      keywords: skin.industries ?? [],
    };
  const pack = skinPackById(skinPackId(skin.code)) ?? stylePackFromSkin(skin);
  const compositions: IndustryBgComposition[] = [];
  for (const scene of SKIN_SCENES) {
    for (let take = 0; take < SKIN_BG_TAKES; take += 1) {
      compositions.push({
        scene,
        take,
        takeLabel: TAKE_LABEL[take] ?? `Take ${take + 1}`,
        seed: industryBgSeed(scene, take),
      });
    }
  }
  return {
    recipeId: skin.code,
    packId: pack.id,
    name: recipe.name,
    recipe,
    skin,
    motif: motifFamilyFor(skin),
    motifLabel: MOTIF_LABEL[motifFamilyFor(skin)],
    signature: skinSignature(skin),
    palette: skin.palette,
    mode: skin.mode,
    families: INDUSTRY_BG_FAMILIES,
    compositions,
    pack,
    layers: (scene, take = 0) => pack.ground(industryBgSeed(scene, take)),
  };
}

let cache: IndustryBackgroundSet[] | null = null;
let coreCacheSets: IndustryBackgroundSet[] | null = null;

/** All 30 industry background sets, in recipe order. */
export function industryBackgroundSets(): IndustryBackgroundSet[] {
  cache ??= INDUSTRY_SKINS.map(buildSet);
  return cache;
}

/** The 28 approved core visual languages as background systems (S01–S28). */
export function coreBackgroundSets(): IndustryBackgroundSet[] {
  coreCacheSets ??= DESIGN_SKINS.filter((sk) => /^S\d{2}$/.test(sk.code)).map(buildSet);
  return coreCacheSets ?? [];
}

/** Core + industry systems, one master list. */
export function allBackgroundSets(): IndustryBackgroundSet[] {
  return [...coreBackgroundSets(), ...industryBackgroundSets()];
}

/** One industry background set by recipe id (`R07`) or pack id (`skin-r07`). */
export function industryBackgroundSet(id: string | null | undefined): IndustryBackgroundSet | null {
  if (!id) return null;
  const code = /^skin-r\d{2}$/i.test(id.trim())
    ? id.trim().slice(-3).toUpperCase()
    : id.trim().toUpperCase();
  return industryBackgroundSets().find((s) => s.recipeId === code) ?? null;
}

/** How many compositions one industry background set exposes (11 × 4 = 44). */
export const INDUSTRY_BG_COMBOS = SKIN_SCENES.length * SKIN_BG_TAKES;

/**
 * COMPOSITE PACK: keep the chosen S-style's typography, cards, geometry and
 * layout, and take only `ground()` from the industry background system. Module
 * renderers are untouched — this is a pack-level composition, nothing forked.
 */
/** Rough luminance test for a pack's page field. */
function isDarkSurface(hex: string): boolean {
  const h = (hex ?? "").replace("#", "");
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
}

function takeFromSeed(seed: string): number {
  const m = /take:(\d+)/i.exec(seed);
  return m ? parseInt(m[1]!, 10) : 0;
}

export function withIndustryGround(
  basePack: StylePack,
  recipeId: string | null | undefined,
): StylePack {
  const set = industryBackgroundSet(recipeId);
  if (!set) return basePack;
  const skin = industrySkinByCode(set.recipeId);
  if (!skin) return basePack;
  // APPEARANCE MATCH: a dark sector plate under a light style pack (or the
  // reverse) reads as a muddy grey field — the "demo has no background" bug.
  // When the two disagree we keep the sector's authored scene GEOMETRY but
  // render it in the host pack's own palette, over the pack's own ground.
  const hostDark = isDarkSurface(basePack.tokens.surface);
  const clash = hostDark !== (skin.mode === "dark");
  return {
    ...basePack,
    reference: `${basePack.reference} · ${set.recipeId} GROUND`,
    ground: clash
      ? (seed) => [
          ...tonedIndustrySceneLayers(
            set.recipeId,
            sceneFromSeed(seed),
            {
              surface: basePack.tokens.surface,
              ink: basePack.tokens.ink,
              accent: basePack.tokens.accent,
              accentAlt: basePack.tokens.accentAlt,
              dark: hostDark,
            },
            takeFromSeed(seed),
          ),
          // Keep only the host pack's TONAL layers (gradients/washes). Its own
          // authored imagery — photo plates, data-URI scene art — must not ride
          // along, or the wrong sector's artwork wins over the chosen recipe.
          ...basePack.ground(seed).filter((layer) => !layer.includes("url(")),
        ]
      : (seed) => set.pack.ground(seed),
    swatch: basePack.swatch,
  };
}
