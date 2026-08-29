// ---------------------------------------------------------------------------
// PER-DIVISION CONFORMANCE PRESETS
//
// A conformance preset answers one question for a single brand scope: "which
// modules does this division ship, wearing which look, and what must every one
// of those slides be true about?"
//
// The presets are DERIVED, never authored twice:
//   * the module set comes from the module registry (`registeredModuleIds()` /
//     `findSlideModule()`), so a family that moves owners cannot silently drop
//     out of a division's conformance sweep,
//   * the look comes from `packIdForBrandMode()`,
//   * the palette spec comes from `resolveBrandMode()` — which already enforces
//     the approved enterprise palette for every TransPerfect division and lets
//     only the product/co-brand identities (DataForce, Element, Co-brand) keep
//     their own accents.
//
// `conformanceSpecIssues()` is a pure checker so both the vitest matrix and any
// admin surface report the same verdict.
// ---------------------------------------------------------------------------

import "@/components/slide/modules/register-all";
import { findSlideModule } from "@/components/slide/module-registry";
import { ENTERPRISE_BRAND_TOKENS, isTransPerfectBrandScope, resolveBrandMode } from "./brand-profiles";
import { backdropSetFor } from "./division-backdrop-manifest";
import { LIBRARY_PRESETS, type LibraryPreset } from "./library-presets";
import { packIdForBrandMode } from "./look-brand";
import { BRAND_MODES, MODULE_VARIANTS, type BrandMode } from "./taxonomy";

/** Families a division deck cannot be signed off without. */
export const REQUIRED_FAMILY_PREFIXES = ["MV-OP", "MV-STAT", "MV-PROC", "MV-CLOSE"] as const;

export type DivisionConformancePreset = {
  /** Brand scope id (bm-*). */
  brandModeId: string;
  /** Human label, e.g. "DataForce". */
  name: string;
  /** Showcase slug when a shareable library URL exists for this scope. */
  slug: string | null;
  /** Approved style pack the division's slides must wear (null = brand default). */
  packId: string | null;
  /** Industry ground recipe from the showcase preset, when one is pinned. */
  recipe: string | null;
  /** Faces every module in the set has to render in. */
  faces: readonly ("light" | "dark")[];
  /** Palette the slides must resolve to. */
  tokens: BrandMode["tokens"];
  /** True for TransPerfect divisions: enterprise palette is mandatory. */
  enterprisePalette: boolean;
  /** Backdrop set key + counts backing this scope's grounds. */
  backdrop: ReturnType<typeof backdropSetFor>;
  /** Registry-owned variant ids in this division's conformance set. */
  moduleIds: string[];
};

function presetFor(brandModeId: string): LibraryPreset | undefined {
  return LIBRARY_PRESETS.find((p) => p.search.scope === brandModeId);
}

/**
 * Variants that are intentionally not family-owned. `MV-CANVAS-BLANK` is an
 * empty branded stage the author composes freehand, so there is no design spec
 * for a conformance sweep to hold it to.
 */
export const UNSPECIFIED_VARIANT_IDS = ["MV-CANVAS-BLANK"] as const;

/** Every variant the module registry currently owns, in taxonomy order. */
export function registryOwnedVariantIds(): string[] {
  return MODULE_VARIANTS.filter((v) => findSlideModule(v.id)).map((v) => v.id);
}

/** Registry-owned variants that carry a spec — the conformance set. */
export function specifiedVariantIds(): string[] {
  const skip = new Set<string>(UNSPECIFIED_VARIANT_IDS);
  return registryOwnedVariantIds().filter((id) => !skip.has(id));
}

export function divisionConformancePreset(brandModeId: string): DivisionConformancePreset {
  const brand = resolveBrandMode(brandModeId);
  const showcase = presetFor(brandModeId);
  const enterprisePalette = isTransPerfectBrandScope(brandModeId);
  return {
    brandModeId,
    name: brand.name,
    slug: showcase?.slug ?? null,
    packId: showcase?.search.look ?? packIdForBrandMode(brandModeId) ?? null,
    recipe: showcase?.search.recipe ?? null,
    faces: ["light", "dark"],
    tokens: enterprisePalette ? { ...ENTERPRISE_BRAND_TOKENS } : { ...brand.tokens },
    enterprisePalette,
    backdrop: backdropSetFor(brandModeId),
    moduleIds: specifiedVariantIds(),
  };
}

/** One preset per brand scope in the taxonomy. */
export function divisionConformancePresets(): DivisionConformancePreset[] {
  return BRAND_MODES.map((b) => divisionConformancePreset(b.id));
}

/**
 * Pure spec check: does this preset still describe a shippable division?
 * Returns a list of human-readable issues — empty means conformant.
 */
export function conformanceSpecIssues(preset: DivisionConformancePreset): string[] {
  const issues: string[] = [];

  if (preset.moduleIds.length === 0) {
    issues.push(`${preset.brandModeId}: no registry-owned modules in the conformance set`);
  }

  for (const prefix of REQUIRED_FAMILY_PREFIXES) {
    if (!preset.moduleIds.some((id) => id.startsWith(prefix))) {
      issues.push(`${preset.brandModeId}: conformance set is missing the ${prefix}-* family`);
    }
  }

  if (preset.enterprisePalette) {
    for (const key of ["primary", "accent", "surface", "ink"] as const) {
      if (preset.tokens[key].toUpperCase() !== ENTERPRISE_BRAND_TOKENS[key].toUpperCase()) {
        issues.push(
          `${preset.brandModeId}: ${key} ${preset.tokens[key]} breaks the approved enterprise palette`,
        );
      }
    }
  }

  if (preset.faces.length !== 2) {
    issues.push(`${preset.brandModeId}: both light and dark faces must be covered`);
  }

  if (preset.backdrop.photos + preset.backdrop.abstracts === 0) {
    issues.push(`${preset.brandModeId}: backdrop set "${preset.backdrop.setKey}" is empty`);
  }

  return issues;
}

/** A small, deterministic sample of a preset's set for render sweeps. */
export function conformanceSampleIds(preset: DivisionConformancePreset, perFamily = 1): string[] {
  const out: string[] = [];
  for (const prefix of REQUIRED_FAMILY_PREFIXES) {
    out.push(...preset.moduleIds.filter((id) => id.startsWith(prefix)).slice(0, perFamily));
  }
  return out;
}
