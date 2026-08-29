// ---------------------------------------------------------------------------
// PER-DIVISION DESIGN SPECS
//
// Until now only DataForce had a real design spec (its own R03 template, green
// lead, blue glyphs) — every other brand scope fell through to "brand default",
// so a division's showcase, conformance preset and module cards all rendered the
// generic catalog look. This table gives EVERY brand scope its own spec:
//
//   * `packId`      — approved style pack its light-face slides wear,
//   * `darkPackId`  — approved pack its dark-face slides wear,
//   * `recipe`      — industry ground recipe (R01–R30) driving its backdrops.
//
// Palette is deliberately NOT part of the spec: division accent colours were
// retired, so every TransPerfect division renders in the approved enterprise
// palette and differs by lockup, look, recipe and copy only. Product/co-brand
// identities (DataForce, Element, Co-brand) keep their own palettes, which
// `resolveBrandMode()` already owns.
// ---------------------------------------------------------------------------

import { DESIGN_SKINS, INDUSTRY_RECIPES } from "./design-skins";
import { packIdForBrandMode } from "./look-brand";
import { BRAND_MODES } from "./taxonomy";

export type DivisionDesignSpec = {
  /** Pack id for light-face slides (skin-sNN or skin-rNN). */
  packId: string;
  /** Pack id for dark-face slides. */
  darkPackId: string;
  /** Industry ground recipe id (R01–R30). */
  recipe: string;
  /** Why this pairing — surfaced in the Override Inspector. */
  rationale: string;
};

/** Brand scope id → its own design spec. */
export const DIVISION_DESIGN_SPECS: Record<string, DivisionDesignSpec> = {
  "bm-enterprise": {
    packId: "skin-s06",
    darkPackId: "skin-s04",
    recipe: "R01",
    rationale: "Master brand: Enterprise Grid light / Precision Dark dark on the corporate recipe.",
  },
  "bm-subcompany": {
    packId: "skin-s12",
    darkPackId: "skin-s04",
    recipe: "R01",
    rationale: "Named subcompanies lead with Operational Enterprise structure.",
  },
  "bm-division": {
    packId: "skin-s03",
    darkPackId: "skin-s05",
    recipe: "R02",
    rationale: "GlobalLink is platform/technology storytelling — Gradient Infrastructure.",
  },
  "bm-tp-lifesci": {
    packId: "skin-s15",
    darkPackId: "skin-s20",
    recipe: "R09",
    rationale: "Life Sciences reads as evidence: Editorial Intelligence over the pharma recipe.",
  },
  "bm-tp-legal": {
    packId: "skin-s14",
    darkPackId: "skin-s05",
    recipe: "R10",
    rationale: "Legal wants Swiss Rational precision and the legal ground recipe.",
  },
  "bm-tp-media": {
    packId: "skin-s18",
    darkPackId: "skin-s18",
    recipe: "R21",
    rationale: "Media leads on imagery — Cinematic Impact on the media recipe, both faces.",
  },
  "bm-tp-games": {
    packId: "skin-s23",
    darkPackId: "skin-s25",
    recipe: "R22",
    rationale: "Gaming uses the expressive Neo-Brutal / Kinetic pairing on the gaming plates.",
  },
  "bm-tp-digital": {
    packId: "skin-s08",
    darkPackId: "skin-s11",
    recipe: "R18",
    rationale: "Digital experience work pairs Expressive Utility with the commerce recipe.",
  },
  "bm-trial-interactive": {
    packId: "skin-s12",
    darkPackId: "skin-s20",
    recipe: "R08",
    rationale: "Trial Interactive is an eClinical product: operational structure, healthcare ground.",
  },
  "bm-product": {
    packId: packIdForBrandMode("bm-product") ?? "skin-r03",
    darkPackId: packIdForBrandMode("bm-product") ?? "skin-r03",
    recipe: "R03",
    rationale: "DataForce owns the AI · Data Signature template on both faces.",
  },
  "bm-element": {
    packId: "skin-s29",
    darkPackId: "skin-s30",
    recipe: "R02",
    rationale: "Element product identity: the S29/S30 Element System pair.",
  },
  "bm-cobrand": {
    packId: "skin-s17",
    darkPackId: "skin-s27",
    recipe: "R01",
    rationale: "Co-branded decks stay warm and neutral so the partner mark can lead.",
  },
};

const FALLBACK_SPEC: DivisionDesignSpec = DIVISION_DESIGN_SPECS["bm-enterprise"]!;

/** Design spec for a brand scope, falling back to the master brand spec. */
export function divisionDesignSpec(brandModeId: string | null | undefined): DivisionDesignSpec {
  if (!brandModeId) return FALLBACK_SPEC;
  return DIVISION_DESIGN_SPECS[brandModeId] ?? FALLBACK_SPEC;
}

/** Pack id a scope's slides wear on one face. */
export function divisionPackId(brandModeId: string | null | undefined, face: "light" | "dark" = "light"): string {
  const spec = divisionDesignSpec(brandModeId);
  return face === "dark" ? spec.darkPackId : spec.packId;
}

const SKIN_CODES = new Set(DESIGN_SKINS.map((s) => s.code.toUpperCase()));
const RECIPE_IDS = new Set(INDUSTRY_RECIPES.map((r) => r.id.toUpperCase()));

/** True when a pack id points at a real catalog skin or industry signature. */
export function isKnownPackId(id: string): boolean {
  const code = id.replace(/^(tpl|skin)-/i, "").toUpperCase();
  return SKIN_CODES.has(code) || RECIPE_IDS.has(code);
}

/** Issues in the spec table itself — every scope covered, every id resolvable. */
export function divisionDesignSpecIssues(): string[] {
  const issues: string[] = [];
  for (const brand of BRAND_MODES) {
    const spec = DIVISION_DESIGN_SPECS[brand.id];
    if (!spec) {
      issues.push(`${brand.id}: no design spec — the scope would fall back to the generic look`);
      continue;
    }
    for (const [key, id] of [
      ["packId", spec.packId],
      ["darkPackId", spec.darkPackId],
    ] as const) {
      if (!isKnownPackId(id)) issues.push(`${brand.id}: ${key} "${id}" is not an approved pack`);
    }
    if (!RECIPE_IDS.has(spec.recipe.toUpperCase())) {
      issues.push(`${brand.id}: recipe "${spec.recipe}" is not an industry recipe`);
    }
  }
  return issues;
}
