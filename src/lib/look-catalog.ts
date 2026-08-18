/**
 * LOOK CATALOG — one cohesive list of every template/look the app can render,
 * shared by Template Studio (/admin/templates, /looks), the library picker, the
 * deck editor's "Look & feel" switcher and the agent's design step.
 *
 * Families:
 *   • core      — the 28 approved OnDeck visual languages (S01–S28)
 *   • industry  — the 30 curated industry signatures (R01–R30)
 *   • signature — the built-in alternate style packs
 *   • custom    — admin-published templates from the alternate-look intake
 *
 * Everything resolves through `stylePackById`, so a look chosen on any surface
 * renders identically on preview, print and PPTX export.
 */

import { designSkinByCode, type DesignSkin } from "./design-skins";
import { industrySkinByCode } from "./industry-skins";
import {
  highContrastPackFromSkin,
  isSkinPackId,
  skinCodeFromPackId,
} from "./design-skin-pack";
import { isTemplatePackId, templateCodeFromPackId } from "./custom-templates";
import { ALL_STYLE_PACKS, allSelectablePacks, type StylePack } from "./style-packs";
import { approvedStyles, isApprovedStyleId, type ApprovedStyle } from "./approved-visual-styles";
import { skinBackgroundSummary } from "./skin-backgrounds";
import { skinSpecSummary } from "./skin-spec-tokens";

export type LookFamily = "core" | "industry" | "signature" | "custom";

export const LOOK_FAMILIES: Array<{ id: LookFamily; label: string; note: string }> = [
  { id: "core", label: "OnDeck core", note: "The 28 approved visual languages" },
  { id: "industry", label: "Industry", note: "Curated sector signatures" },
  { id: "signature", label: "Signature packs", note: "Built-in alternate looks" },
  { id: "custom", label: "Custom", note: "Admin-published templates" },
];

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
}

/** Which family a pack id belongs to. */
export function lookFamilyOf(id: string | null | undefined): LookFamily | null {
  if (!id) return null;
  if (isTemplatePackId(id)) return "custom";
  if (isApprovedStyleId(id)) return "core";
  if (/^skin-r/i.test(id)) return "industry";
  return "signature";
}

function entryFromApproved(style: ApprovedStyle): LookEntry {
  return { ...style, family: "core" };
}

function entryFromSkin(skin: DesignSkin, pack: StylePack, family: LookFamily): LookEntry {
  const industries = skin.industries?.length ? skin.industries : chipsFromText(skin.bestFit);
  return {
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
  };
}

function chipsFromText(text: string): string[] {
  return text
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** A look built from pack fields only — built-in packs and custom templates. */
function entryFromPack(pack: StylePack, family: LookFamily): LookEntry {
  const code = isTemplatePackId(pack.id)
    ? templateCodeFromPackId(pack.id)
    : pack.id.replace(/^pack-/, "").toUpperCase();
  const chips = chipsFromText(pack.tagline);
  return {
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
  };
}

function buildEntry(pack: StylePack): LookEntry {
  const family = lookFamilyOf(pack.id) ?? "signature";
  if (family === "industry" && isSkinPackId(pack.id)) {
    const skin = industrySkinByCode(skinCodeFromPackId(pack.id));
    if (skin) return entryFromSkin(skin, pack, "industry");
  }
  if (family === "core" && isSkinPackId(pack.id)) {
    const skin = designSkinByCode(skinCodeFromPackId(pack.id));
    if (skin) return entryFromSkin(skin, pack, "core");
  }
  return entryFromPack(pack, family);
}

/**
 * Every look, in a stable family order: core → industry → signature → custom.
 * Pass the hydrated pack list (from `useSelectablePacks`) so admin-published
 * templates are included; omit it for the built-in-only server render.
 */
export function lookCatalog(packs?: StylePack[]): LookEntry[] {
  const source = packs ?? ALL_STYLE_PACKS;
  const core = approvedStyles().map(entryFromApproved);
  const coreIds = new Set(core.map((e) => e.pack.id));
  const rest = source.filter((p) => !coreIds.has(p.id)).map(buildEntry);
  const order: Record<LookFamily, number> = { core: 0, industry: 1, signature: 2, custom: 3 };
  return [...core, ...rest].sort((a, b) => order[a.family] - order[b.family]);
}

/** Looks of one family. */
export function looksInFamily(family: LookFamily, packs?: StylePack[]): LookEntry[] {
  return lookCatalog(packs).filter((e) => e.family === family);
}

/** Resolve a pack id to its catalog entry, across every family. */
export function lookEntryByPackId(
  id: string | null | undefined,
  packs?: StylePack[],
): LookEntry | null {
  if (!id) return null;
  return lookCatalog(packs ?? allSelectablePacks()).find((e) => e.pack.id === id) ?? null;
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
  const out: Record<LookFamily, number> = { core: 0, industry: 0, signature: 0, custom: 0 };
  for (const e of lookCatalog(packs)) out[e.family] += 1;
  return out;
}
