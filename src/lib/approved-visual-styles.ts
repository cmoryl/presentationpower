/**
 * APPROVED VISUAL STYLE LIBRARY — selector layer.
 *
 * The approved library exposes exactly the 28 core OnDeck visual languages
 * (S01–S28). Everything else stays resolvable but hidden:
 *
 *   • R01–R30 are INDUSTRY RECIPES / FILTERS, not competing styles. Selecting an
 *     industry recommends core S-styles; it never adds 30 more thumbnails.
 *   • Legacy `STYLE_PACKS` and admin templates remain callable through
 *     `stylePackById()` so existing decks, URLs and saved state keep working —
 *     they are simply never mixed into approved results.
 *
 * This module only *selects and describes*; resolution stays in style-packs.ts.
 */

import {
  DESIGN_SKINS,
  INDUSTRY_RECIPES,
  designSkinByCode,
  designSkinByName,
  industryRecipeById,
  matchRecipes,
  type DesignSkin,
  type IndustryRecipe,
} from "./design-skins";
import { SKIN_PACKS, skinPackId, skinCodeFromPackId, isSkinPackId } from "./design-skin-pack";
import type { StylePack } from "./style-packs";
import { skinBackgroundSummary } from "./skin-backgrounds";

/** The approved catalog codes, in curated catalog order. */
export const APPROVED_STYLE_CODES: string[] = DESIGN_SKINS.map((s) => s.code);

/** Only the 28 core visual languages, as renderable packs, in catalog order. */
export function approvedVisualStylePacks(): StylePack[] {
  return SKIN_PACKS.filter((p) => APPROVED_STYLE_CODES.includes(skinCodeFromPackId(p.id)));
}

/** Is this pack id one of the approved 28? (R-signatures and legacy are not.) */
export function isApprovedStyleId(id: string | null | undefined): boolean {
  if (!id || !isSkinPackId(id)) return false;
  return APPROVED_STYLE_CODES.includes(skinCodeFromPackId(id));
}

/**
 * MODE SUPPORT. The catalog specifies Light / Dark / High contrast for every
 * approved language: the render system derives mode-safe token fallbacks rather
 * than forking the style, so this is real metadata, not a decorative badge.
 * `native` is the mode the language was authored in and still renders in by
 * default — nothing about existing rendering changes here.
 */
export const APPROVED_MODES = ["Light", "Dark", "High contrast"] as const;

export interface ApprovedStyle {
  code: string;
  name: string;
  reference: string;
  description: string;
  /** 3–4 concise industry chips derived from the catalog `bestFit` field. */
  chips: string[];
  /** Native (authored) rendering mode. */
  nativeMode: "light" | "dark";
  /** Supported modes — every approved language supports all three. */
  modes: readonly string[];
  modeLabel: string;
  density: string;
  /** 4–5 palette swatches straight from the catalog. */
  palette: string[];
  backdrop: string;
  skin: DesignSkin;
  pack: StylePack;
}

function chipsFrom(bestFit: string): string[] {
  return bestFit
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

let cache: ApprovedStyle[] | null = null;

/** Every approved style with the metadata the library card needs. */
export function approvedStyles(): ApprovedStyle[] {
  if (cache) return cache;
  cache = DESIGN_SKINS.map((skin) => {
    const pack = SKIN_PACKS.find((p) => p.id === skinPackId(skin.code))!;
    return {
      code: skin.code,
      name: skin.name,
      reference: skin.reference,
      description: skin.description,
      chips: chipsFrom(skin.bestFit),
      nativeMode: skin.mode,
      modes: APPROVED_MODES,
      modeLabel: `Light · Dark · HC · native ${skin.mode}`,
      density: skin.density,
      palette: skin.palette.slice(0, 5),
      backdrop: skinBackgroundSummary(skin),
      skin,
      pack,
    };
  });
  return cache;
}

export function approvedStyleByCode(code: string | null | undefined): ApprovedStyle | null {
  if (!code) return null;
  const want = code.trim().toUpperCase();
  return approvedStyles().find((s) => s.code === want) ?? null;
}

export function approvedStyleByPackId(id: string | null | undefined): ApprovedStyle | null {
  if (!isApprovedStyleId(id)) return null;
  return approvedStyleByCode(skinCodeFromPackId(id!));
}

/**
 * Search across style name, reference, description and best-fit industries.
 * Empty query returns the curated catalog order untouched.
 */
export function searchApprovedStyles(query: string, from?: ApprovedStyle[]): ApprovedStyle[] {
  const list = from ?? approvedStyles();
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return list;
  return list
    .map((s) => {
      const hay = `${s.code} ${s.name} ${s.reference} ${s.description} ${s.chips.join(" ")} ${s.density}`.toLowerCase();
      const score = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

/**
 * INDUSTRY-FIRST RECOMMENDATION. The recipe's own DNA leads (those languages
 * are pre-approved for the sector), then catalog best-fit matches fill in.
 * Result is always a subset of the approved 28.
 */
export function recommendApprovedStyles(opts: {
  recipeId?: string | null;
  intent?: string;
  limit?: number;
}): ApprovedStyle[] {
  const limit = opts.limit ?? 8;
  const recipe = industryRecipeById(opts.recipeId);
  const out: ApprovedStyle[] = [];
  const push = (skin: DesignSkin | null) => {
    if (!skin) return;
    const entry = approvedStyleByCode(skin.code);
    if (entry && !out.some((s) => s.code === entry.code)) out.push(entry);
  };

  for (const name of recipe?.dna ?? []) push(designSkinByName(name));

  // Free-text intent, plus any recipe implied by that text.
  const implied = recipe ? [] : matchRecipes(opts.intent ?? "", 2);
  for (const r of implied) for (const name of r.dna) push(designSkinByName(name));

  const words = `${opts.intent ?? ""} ${recipe?.name ?? ""} ${recipe?.summary ?? ""} ${(recipe?.keywords ?? []).join(" ")}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);
  if (words.length) {
    const scored = approvedStyles()
      .map((s) => {
        const hay = `${s.chips.join(" ")} ${s.description} ${s.name}`.toLowerCase();
        return { s, score: words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    for (const { s } of scored) if (!out.some((o) => o.code === s.code)) out.push(s);
  }

  return out.slice(0, limit);
}

/** All industry recipes, for the industry-first selector. */
export function industryFilters(): IndustryRecipe[] {
  return INDUSTRY_RECIPES;
}

/**
 * The recipe's three narrative-use presets. They are story framings, not extra
 * visual styles: each resolves to the approved DNA language beneath it, so the
 * look never fragments.
 */
export function recipePresets(
  recipeId: string | null | undefined,
): { name: string; note: string; resolvesTo: string | null }[] {
  const recipe = industryRecipeById(recipeId);
  if (!recipe) return [];
  return recipe.presets.map((p, i) => {
    const dnaName = recipe.dna[Math.min(i, recipe.dna.length - 1)];
    const skin = dnaName ? designSkinByName(dnaName) : null;
    return { name: p.name, note: p.note, resolvesTo: skin?.code ?? null };
  });
}

/** Style codes a recipe's DNA maps to, for "recommended" badges. */
export function recipeDnaCodes(recipeId: string | null | undefined): string[] {
  const recipe = industryRecipeById(recipeId);
  if (!recipe) return [];
  return recipe.dna
    .map((n) => designSkinByName(n)?.code)
    .filter((c): c is string => Boolean(c));
}

export { designSkinByCode };
