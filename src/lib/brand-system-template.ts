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
import {
  authoredGround,
  groundIsReplaced,
  resolveGroundLayers,
  withAlpha,
} from "./template-background";
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
  // A saved-but-neutral row (no image, tint, swap or intensity change) is not
  // an edit — treating it as one hid the approved S01 artwork behind the old
  // procedural ground on agenda, chart and quote slides.
  const o = overrideFor(BRAND_SYSTEM_CODE, sceneFromSeed(seed));
  return !!o && !isNeutralOverride(o);
}

/** True when an admin has saved an edit against the master's DARK face. */
export function brandSystemDarkHasEdit(seed: string): boolean {
  if (groundIsReplaced(BRAND_SYSTEM_DARK_CODE, seed)) return true;
  const o = overrideFor(BRAND_SYSTEM_DARK_CODE, sceneFromSeed(seed));
  return !!o && !isNeutralOverride(o);
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
    () => brandSystemDarkLayers(accentHex),
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
 * HOUSE DEPTH ON THE LIGHT PAGE — the approved white page kept reading as a
 * bare sheet, so the master's light face now carries a colour field by default:
 * a Blue White vertical graduation plus three soft approved-token washes placed
 * in the corners. Alphas are held low so the Spatial Clarity geometry still
 * shows through and the middle of the page — where the copy sits — stays pale.
 *
 * Tokens only (Blue 500, Blue White, Aqua, Lavender); the secondaries stay a
 * small share of the field. An admin BSYS edit still outranks this.
 */
export function brandSystemLightDepthLayers(accentHex?: string, seed = ""): string[] {
  const accent = accentHex || ENTERPRISE_WHITE.accent;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const flip = Math.abs(h) % 2 === 1;
  const x = (left: string, right: string) => (flip ? right : left);
  // withAlpha, never raw 8-digit hex: brand accents reach here as rgb()/oklch
  // strings on some surfaces, and `${accent}1F` made the WHOLE layer list
  // invalid CSS — which is exactly how the light page ended up painting nothing.
  const a = (c: string, v: number) => withAlpha(c, v);
  return [
    `radial-gradient(112% 86% at ${x("92% 4%", "8% 4%")}, ${a(accent, 0.13)} 0%, ${a(accent, 0.05)} 38%, transparent 66%)`,
    `radial-gradient(96% 78% at ${x("4% 96%", "96% 96%")}, ${a("#A1FBF9", 0.26)} 0%, transparent 58%)`,
    `radial-gradient(74% 66% at ${x("10% 12%", "90% 12%")}, ${a("#C2A3FF", 0.2)} 0%, transparent 56%)`,
    `linear-gradient(176deg, ${a("#E0E8F5", 0.68)} 0%, ${a("#EEF1F7", 0.32)} 42%, ${a("#FFFFFF", 0)} 62%, ${a("#E0E8F5", 0.58)} 100%)`,
  ];
}


/**
 * CSS background for the default system's light page.
 *
 * Resolves the Spatial Clarity authored layers through the one shared override
 * resolver, keyed to BSYS when the default system carries its own edit, so the
 * editor, present, share, print, export and library previews all agree. With no
 * admin edit the house depth field paints in front of that quiet geometry.
 */
export function brandSystemLightGround(seed: string, accentHex?: string): string {
  const base = stylePackById(BRAND_SYSTEM_BASE_PACK_ID);
  const layers = base ? brandSystemLightLayers(base, seed, accentHex) : [];
  if (layers.length) return layers.join(", ");
  // NEVER return an empty ground. The light page was painting literally nothing
  // whenever the S01 pack or its resolved layers came back empty on a surface —
  // the bare-white-sheet symptom. The house depth field is the floor.
  const fallback = enterpriseGroundFor(seed, accentHex);
  const depth = brandSystemLightDepthLayers(accentHex, seed).join(", ");
  return fallback ? `${depth}, ${fallback}` : depth;
}


/** Light-face layers: house depth (unless edited/replaced) over Spatial Clarity. */
function brandSystemLightLayers(base: StylePack, seed: string, accentHex?: string): string[] {
  const edited = brandSystemHasEdit(seed);
  const code = edited ? BRAND_SYSTEM_CODE : BRAND_SYSTEM_BASE_CODE;
  const layers = resolveGroundLayers(authoredGround(base), code, seed, ENTERPRISE_WHITE.surface);
  // Replacement artwork IS the page; a saved BSYS edit is the admin's own look.
  // Everything else — including a saved edit that resolves to NO layers, which
  // is how the light page ended up painting a bare white sheet — gets the house
  // depth field over the approved Spatial Clarity ground.
  if (brandSystemGroundIsReplaced(seed)) return layers;
  if (edited && layers.length) return layers;
  const authored = layers.length
    ? layers
    : resolveGroundLayers(
        authoredGround(base),
        BRAND_SYSTEM_BASE_CODE,
        seed,
        ENTERPRISE_WHITE.surface,
      );
  return [...brandSystemLightDepthLayers(accentHex, seed), ...authored];
}


/** True when the default system's ground for this seed is replaced artwork. */
export function brandSystemGroundIsReplaced(seed: string): boolean {
  return (
    groundIsReplaced(BRAND_SYSTEM_CODE, seed) || groundIsReplaced(BRAND_SYSTEM_BASE_CODE, seed)
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
          () => brandSystemDarkLayers(ENTERPRISE_WHITE.accent),
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
    ground: (seed: string) => brandSystemLightLayers(base, seed, ENTERPRISE_WHITE.accent),
  };
}
