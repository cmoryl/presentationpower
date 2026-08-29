/**
 * DEFAULT BRAND SYSTEM TEMPLATE — the look a deck gets when no alternate style
 * pack is chosen (Enterprise White light page / brand navy dark page).
 *
 * Two things live here:
 *
 *  1. The light/white face now paints the APPROVED SPATIAL CLARITY (S01)
 *     backgrounds — including any artwork an admin has replaced or tuned —
 *     instead of the older procedural corner-wash set. Spatial Clarity is the
 *     approved quiet white ground, so the default system and S01 stop reading
 *     as two different white templates.
 *
 *  2. The default system is addressable as a real, editable look ("BSYS"), so
 *     the Template Studio can retune its theme and its per-section backgrounds
 *     exactly like every catalog skin. Any BSYS edit outranks the inherited
 *     Spatial Clarity ground; with no BSYS edit the S01 ground shows through.
 */

import { enterpriseGroundFor } from "./enterprise-grounds";
import { sceneFromSeed } from "./skin-backgrounds";
import { ENTERPRISE_WHITE } from "./slide-skin";
import { overrideFor } from "./template-registry";
import { authoredGround, groundIsReplaced, resolveGroundLayers } from "./template-background";
import { stylePackById, type StylePack } from "./style-packs";

/** Pack id the Template Studio lists the default system under. */
export const BRAND_SYSTEM_PACK_ID = "brand-system";
/** Override/background code every BSYS (light face) edit is saved against. */
export const BRAND_SYSTEM_CODE = "BSYS";
/** Override/background code the master's DARK face is saved against. */
export const BRAND_SYSTEM_DARK_CODE = "BSYSD";
/** Pack id the Template Studio lists the master's dark face under. */
export const BRAND_SYSTEM_DARK_PACK_ID = "brand-system-dark";
/** Approved light ground the default system inherits. */
export const BRAND_SYSTEM_BASE_PACK_ID = "skin-s01";
const BRAND_SYSTEM_BASE_CODE = "S01";

export function isBrandSystemPackId(id: string | null | undefined): boolean {
  const v = String(id ?? "");
  return v === BRAND_SYSTEM_PACK_ID || v === BRAND_SYSTEM_DARK_PACK_ID;
}

/** True for the master's dark face specifically. */
export function isBrandSystemDarkPackId(id: string | null | undefined): boolean {
  return String(id ?? "") === BRAND_SYSTEM_DARK_PACK_ID;
}

/** True when an admin has saved a theme/background edit for the default system. */
export function brandSystemHasEdit(seed: string): boolean {
  if (groundIsReplaced(BRAND_SYSTEM_CODE, seed)) return true;
  const o = overrideFor(BRAND_SYSTEM_CODE, sceneFromSeed(seed));
  return !!o;
}

/** True when an admin has saved an edit against the master's DARK face. */
export function brandSystemDarkHasEdit(seed: string): boolean {
  if (groundIsReplaced(BRAND_SYSTEM_DARK_CODE, seed)) return true;
  return !!overrideFor(BRAND_SYSTEM_DARK_CODE, sceneFromSeed(seed));
}

/**
 * The master's DARK page — brand navy floor with two soft accent washes placed
 * in the corners so copy zones stay clean. This is the look the master has
 * always carried on dark slides; keeping it here (rather than inline in the
 * chrome) means the dark face is editable and previewable like the light one.
 */
export function brandSystemDarkLayers(accentHex?: string): string[] {
  const accent = accentHex || ENTERPRISE_WHITE.accent;
  return [
    `radial-gradient(120% 90% at 100% 0%, ${accent}26 0%, transparent 55%)`,
    `radial-gradient(90% 80% at 0% 100%, ${ENTERPRISE_WHITE.accentAlt}1F 0%, transparent 55%)`,
    `linear-gradient(180deg, #050538 0%, #03002C 100%)`,
  ];
}

/** CSS background for the master's dark page, including any admin edit. */
export function brandSystemDarkGround(seed: string, accentHex?: string): string {
  const layers = resolveGroundLayers(
    brandSystemDarkLayers(accentHex),
    BRAND_SYSTEM_DARK_CODE,
    seed,
    BRAND_SYSTEM_DARK_SURFACE,
  );
  return layers.length ? layers.join(", ") : brandSystemDarkLayers(accentHex).join(", ");
}

/** True when the master's dark ground for this seed is replacement artwork. */
export function brandSystemDarkGroundIsReplaced(seed: string): boolean {
  return groundIsReplaced(BRAND_SYSTEM_DARK_CODE, seed);
}

/** Page field of the master's dark face. */
export const BRAND_SYSTEM_DARK_SURFACE = "#03002C";


/**
 * CSS background for the default system's light page.
 *
 * Resolves the Spatial Clarity authored layers through the one shared override
 * resolver, keyed to BSYS when the default system carries its own edit, so the
 * editor, present, share, print, export and library previews all agree.
 */
export function brandSystemLightGround(seed: string, accentHex?: string): string {
  const base = stylePackById(BRAND_SYSTEM_BASE_PACK_ID);
  if (!base) return enterpriseGroundFor(seed, accentHex);
  const code = brandSystemHasEdit(seed) ? BRAND_SYSTEM_CODE : BRAND_SYSTEM_BASE_CODE;
  const layers = resolveGroundLayers(
    authoredGround(base),
    code,
    seed,
    ENTERPRISE_WHITE.surface,
  );
  return layers.length ? layers.join(", ") : enterpriseGroundFor(seed, accentHex);
}

/** True when the default system's ground for this seed is replaced artwork. */
export function brandSystemGroundIsReplaced(seed: string): boolean {
  return (
    groundIsReplaced(BRAND_SYSTEM_CODE, seed) ||
    groundIsReplaced(BRAND_SYSTEM_BASE_CODE, seed)
  );
}

/**
 * The default system as a selectable/editable pack for the Template Studio.
 * Geometry and backgrounds come from Spatial Clarity; palette and identity are
 * the approved brand-system tokens.
 *
 * The master is a PAIR, not a single face: `"light"` is the white page and
 * `"dark"` is the brand-navy page the master has always carried. Listing both
 * keeps the dark look-and-feel intact and independently editable, instead of
 * the light face standing in for the whole master.
 */
export function brandSystemPack(mode: "light" | "dark" = "light"): StylePack | null {
  const base = stylePackById(BRAND_SYSTEM_BASE_PACK_ID);
  if (!base) return null;
  const authored = authoredGround(base);

  if (mode === "dark") {
    return {
      ...base,
      id: BRAND_SYSTEM_DARK_PACK_ID as StylePack["id"],
      label: "Brand System (default) · dark",
      tagline: "The master template's dark page — brand navy floor, quiet corner washes.",
      reference: "TransPerfect brand system · master template",
      mode: "dark",
      tokens: {
        ...base.tokens,
        surface: BRAND_SYSTEM_DARK_SURFACE,
        ink: "#ffffff",
        accent: ENTERPRISE_WHITE.accent,
        primary: ENTERPRISE_WHITE.primary,
      },
      ground: (seed: string) =>
        resolveGroundLayers(
          brandSystemDarkLayers(ENTERPRISE_WHITE.accent),
          BRAND_SYSTEM_DARK_CODE,
          seed,
          BRAND_SYSTEM_DARK_SURFACE,
        ),
    };
  }

  return {
    ...base,
    id: BRAND_SYSTEM_PACK_ID as StylePack["id"],
    label: "Brand System (default)",
    tagline: "The default approved template — white page, navy ink, Spatial Clarity ground.",
    reference: "TransPerfect brand system · master template",
    mode: "light",
    tokens: {
      ...base.tokens,
      surface: ENTERPRISE_WHITE.surface,
      ink: ENTERPRISE_WHITE.ink,
      accent: ENTERPRISE_WHITE.accent,
      primary: ENTERPRISE_WHITE.primary,
    },
    ground: (seed: string) =>
      resolveGroundLayers(
        authored,
        brandSystemHasEdit(seed) ? BRAND_SYSTEM_CODE : BRAND_SYSTEM_BASE_CODE,
        seed,
        ENTERPRISE_WHITE.surface,
      ),
  };
}

