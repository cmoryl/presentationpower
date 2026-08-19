/**
 * LOOK CATALOG — one cohesive list of every APPROVED template/look the app can
 * render, shared by Template Studio (/looks), the library
 * picker, the deck editor's "Look & feel" switcher and the agent's design step.
 *
 * Families:
 *   • core      — the 28 approved OnDeck visual languages (S01–S28)
 *   • industry  — the 30 curated industry background systems (R01–R30)
 *   • custom    — admin-published templates that are EXPLICITLY mapped to an
 *                 approved core style (and, when relevant, an industry ground)
 *   • legacy    — built-in alternate style packs and unmapped templates. These
 *                 stay resolvable for old saved decks but are excluded from every
 *                 normal user-facing gallery; only an admin compatibility drawer
 *                 asks for them (`includeLegacy`).
 *
 * Everything resolves through `stylePackById`, so a look chosen on any surface
 * renders identically on preview, print and PPTX export.
 */

import { designSkinByCode, INDUSTRY_RECIPES, type DesignSkin } from "./design-skins";
import { industrySkinByCode } from "./industry-skins";
import {
  highContrastPackFromSkin,
  isSkinPackId,
  skinCodeFromPackId,
} from "./design-skin-pack";
import { isTemplatePackId, templateCodeFromPackId } from "./custom-templates";
import { customTemplateMapping } from "./template-registry";
import { withIndustryGround } from "./industry-backgrounds";
import { ALL_STYLE_PACKS, allSelectablePacks, type StylePack } from "./style-packs";
import { approvedStyles, isApprovedStyleId, type ApprovedStyle } from "./approved-visual-styles";
import { skinBackgroundSummary, type SkinScene } from "./skin-backgrounds";
import { skinSpecSummary } from "./skin-spec-tokens";

export type LookFamily = "core" | "industry" | "custom" | "legacy";

/** User-facing families. Legacy is never listed here. */
export const LOOK_FAMILIES: Array<{ id: LookFamily; label: string; note: string }> = [
  { id: "core", label: "OnDeck core", note: "The 28 approved visual languages" },
  { id: "industry", label: "Industry", note: "Curated sector background systems" },
  { id: "custom", label: "Approved templates", note: "Admin templates mapped to an approved style" },
];

export const LEGACY_FAMILY = {
  id: "legacy" as LookFamily,
  label: "Legacy (compatibility)",
  note: "Retired packs kept so older saved decks still resolve",
};

/**
 * A look, described with everything a picker card needs. Field names match
 * `ApprovedStyle` so the same card renders any family.
 */
export interface LookEntry {
  family: LookFamily;
  code: string;
  name: string;
  reference: string;
  description: string;
  chips: string[];
  nativeMode: "light" | "dark";
  modes: readonly string[];
  modeLabel: string;
  density: string;
  palette: string[];
  backdrop: string;
  industries: string[];
  specSummary: string;
  /** Catalog metadata when the look comes from a design skin. */
  skin?: DesignSkin;
  pack: StylePack;
  /** High-contrast rendering of the same look (falls back to the native pack). */
  hcPack: StylePack;
  /** Approved core style this look's typography/geometry follows, when known. */
  approvedStyleCode: string | null;
  /** Industry background system used for the preview ground, when relevant. */
  industryRecipeId: string | null;
  /** Pack the gallery thumbnail must render — S-style with the relevant R ground. */
  thumbPack: StylePack;
  /** Scene family the thumbnail previews, matched to the look's role. */
  thumbScene: SkinScene;
}

/** Which family a pack id belongs to. */
export function lookFamilyOf(id: string | null | undefined): LookFamily | null {
  if (!id) return null;
  if (isTemplatePackId(id)) {
    const map = customTemplateMapping(templateCodeFromPackId(id));
    return map && approvedMappingCode(map.baseSkinCode) ? "custom" : "legacy";
  }
  if (isApprovedStyleId(id)) return "core";
  if (/^skin-r/i.test(id)) return "industry";
  return "legacy";
}

/** Normalised approved code ("S07" / "R14") or null when unmapped/off-brand. */
function approvedMappingCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return null;
  if (/^S\d{2}$/.test(c) && designSkinByCode(c)) return c;
  if (/^R\d{2}$/.test(c) && industrySkinByCode(c)) return c;
  return null;
}

/** Best industry background system for a free-text purpose, or null. */
export function industryRecipeForText(text: string | null | undefined): string | null {
  const hay = (text ?? "").toLowerCase();
  if (!hay.trim()) return null;
  let best: { id: string; score: number } | null = null;
  for (const r of INDUSTRY_RECIPES) {
    const terms = [
      ...r.name.split(/[^a-z0-9]+/i),
      ...r.keywords.flatMap((k) => k.split(/[^a-z0-9]+/i)),
    ]
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 3);
    const score = terms.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { id: r.id, score };
  }
  return best?.id ?? null;
}

const SCENE_RULES: Array<[RegExp, SkinScene]> = [
  [/cover|title|opener|hero|statement/i, "cover"],
  [/close|closing|cta|thank|next step/i, "closing"],
  [/quote|testimonial|voice/i, "quote"],
  [/kpi|stat|metric|proof|number|result/i, "stats"],
  [/chart|data|dashboard|graph|trend|analytic/i, "chart"],
  [/timeline|roadmap|process|journey|phase|flow/i, "timeline"],
  [/bento|grid|matrix|pillar|capabilit|tile/i, "bento"],
  [/agenda|contents/i, "agenda"],
  [/split|compar|two-up/i, "split"],
  [/section|divider|chapter/i, "section"],
];

/** Scene-aware thumbnail selection: preview the look in its intended role. */
export function thumbSceneForText(text: string | null | undefined): SkinScene {
  const hay = text ?? "";
  for (const [re, scene] of SCENE_RULES) if (re.test(hay)) return scene;
  return "cover";
}

function withThumb(
  entry: Omit<LookEntry, "thumbPack" | "thumbScene" | "approvedStyleCode" | "industryRecipeId"> & {
    approvedStyleCode?: string | null;
    industryRecipeId?: string | null;
    thumbScene?: SkinScene;
  },
): LookEntry {
  const industryRecipeId = entry.industryRecipeId ?? null;
  return {
    ...entry,
    approvedStyleCode: entry.approvedStyleCode ?? null,
    industryRecipeId,
    thumbScene: entry.thumbScene ?? "cover",
    thumbPack: industryRecipeId
      ? withIndustryGround(entry.pack, industryRecipeId)
      : entry.pack,
  };
}

/** A core catalog entry for an approved style (used by pickers directly). */
export function lookEntryFromApprovedStyle(style: ApprovedStyle): LookEntry {
  return withThumb({ ...style, family: "core", approvedStyleCode: style.code });
}

function entryFromSkin(
  skin: DesignSkin,
  pack: StylePack,
  family: LookFamily,
  extra: { approvedStyleCode?: string | null; industryRecipeId?: string | null; thumbScene?: SkinScene } = {},
): LookEntry {
  const industries = skin.industries?.length ? skin.industries : chipsFromText(skin.bestFit);
  return withThumb({
    family,
    code: skin.code,
    name: skin.name,
    reference: skin.reference,
    description: skin.description,
    chips: industries.slice(0, 4),
    nativeMode: skin.mode,
    modes: ["Light", "Dark", "High contrast"],
    modeLabel: `Light · Dark · HC · native ${skin.mode}`,
    density: skin.density,
    palette: skin.palette.slice(0, 5),
    backdrop: skinBackgroundSummary(skin),
    industries,
    specSummary: skinSpecSummary(skin),
    skin,
    pack,
    hcPack: highContrastPackFromSkin(skin),
    approvedStyleCode: extra.approvedStyleCode ?? skin.code,
    industryRecipeId: extra.industryRecipeId ?? null,
    thumbScene: extra.thumbScene,
  });
}

function chipsFromText(text: string): string[] {
  return text
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** A look built from pack fields only — legacy packs and custom templates. */
function entryFromPack(
  pack: StylePack,
  family: LookFamily,
  extra: { approvedStyleCode?: string | null; industryRecipeId?: string | null; thumbScene?: SkinScene } = {},
): LookEntry {
  const code = isTemplatePackId(pack.id)
    ? templateCodeFromPackId(pack.id)
    : pack.id.replace(/^pack-/, "").toUpperCase();
  const chips = chipsFromText(pack.tagline);
  return withThumb({
    family,
    code,
    name: pack.label,
    reference: pack.reference,
    description: pack.tagline,
    chips,
    nativeMode: pack.mode,
    modes: ["Light", "Dark", "High contrast"],
    modeLabel: `native ${pack.mode}`,
    density: pack.card.radius === 0 ? "Hard-edge" : "Soft-edge",
    palette: pack.swatch.slice(0, 5),
    backdrop: pack.reference,
    industries: chips,
    specSummary: `${pack.reference} · radius ${pack.card.radius}px`,
    pack,
    hcPack: pack,
    ...extra,
  });
}

function buildEntry(pack: StylePack): LookEntry {
  const family = lookFamilyOf(pack.id) ?? "legacy";
  if (family === "industry" && isSkinPackId(pack.id)) {
    const code = skinCodeFromPackId(pack.id);
    const skin = industrySkinByCode(code);
    if (skin) return entryFromSkin(skin, pack, "industry", { industryRecipeId: code });
  }
  if (family === "core" && isSkinPackId(pack.id)) {
    const skin = designSkinByCode(skinCodeFromPackId(pack.id));
    if (skin) return entryFromSkin(skin, pack, "core");
  }
  if (family === "custom") {
    // Approved custom template: keep its own typography/geometry, but preview it
    // through the approved style + relevant industry ground so no template ever
    // falls back to generic or off-brand art.
    const code = templateCodeFromPackId(pack.id);
    const map = customTemplateMapping(code);
    const approvedCode = approvedMappingCode(map?.baseSkinCode);
    const text = `${map?.name ?? pack.label} ${map?.bestFit ?? ""} ${pack.tagline}`;
    const industryRecipeId = approvedCode?.startsWith("R")
      ? approvedCode
      : industryRecipeForText(text);
    return entryFromPack(pack, "custom", {
      approvedStyleCode: approvedCode,
      industryRecipeId,
      thumbScene: thumbSceneForText(text),
    });
  }
  return entryFromPack(pack, family);
}

export interface LookCatalogOptions {
  /** Include retired/off-brand packs. Admin compatibility surfaces only. */
  includeLegacy?: boolean;
}

/**
 * Every approved look, in a stable family order: core → industry → custom.
 * Pass the hydrated pack list (from `useSelectablePacks`) so admin-published
 * templates are included; omit it for the built-in-only server render.
 */
export function lookCatalog(packs?: StylePack[], opts: LookCatalogOptions = {}): LookEntry[] {
  const source = packs ?? ALL_STYLE_PACKS;
  const core = approvedStyles().map(lookEntryFromApprovedStyle);
  const coreIds = new Set(core.map((e) => e.pack.id));
  const rest = source.filter((p) => !coreIds.has(p.id)).map(buildEntry);
  const order: Record<LookFamily, number> = { core: 0, industry: 1, custom: 2, legacy: 3 };
  return [...core, ...rest]
    .filter((e) => (opts.includeLegacy ? true : e.family !== "legacy"))
    .sort((a, b) => order[a.family] - order[b.family]);
}

/** Retired looks only — admin compatibility drawer. */
export function legacyLooks(packs?: StylePack[]): LookEntry[] {
  return lookCatalog(packs, { includeLegacy: true }).filter((e) => e.family === "legacy");
}

/** Looks of one family. */
export function looksInFamily(family: LookFamily, packs?: StylePack[]): LookEntry[] {
  return lookCatalog(packs, { includeLegacy: family === "legacy" }).filter(
    (e) => e.family === family,
  );
}

/** Resolve a pack id to its catalog entry, across every family (legacy included). */
export function lookEntryByPackId(
  id: string | null | undefined,
  packs?: StylePack[],
): LookEntry | null {
  if (!id) return null;
  return (
    lookCatalog(packs ?? allSelectablePacks(), { includeLegacy: true }).find(
      (e) => e.pack.id === id,
    ) ?? null
  );
}

/** Free-text search over any look list (code, name, reference, chips, density). */
export function searchLooks(query: string, list: LookEntry[]): LookEntry[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return list;
  return list
    .map((e) => {
      const hay =
        `${e.code} ${e.name} ${e.reference} ${e.description} ${e.chips.join(" ")} ${e.density} ${e.family}`.toLowerCase();
      return { e, score: words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}

/** Counts per family, for tab labels. */
export function lookFamilyCounts(packs?: StylePack[]): Record<LookFamily, number> {
  const out: Record<LookFamily, number> = { core: 0, industry: 0, custom: 0, legacy: 0 };
  for (const e of lookCatalog(packs, { includeLegacy: true })) out[e.family] += 1;
  return out;
}

