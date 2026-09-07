// -----------------------------------------------------------------------------
// SOCIAL TEMPLATE GROUND — paint an approved look's authored background artwork
// behind a social post.
//
// Slides get their ground from the template/skin background system: 11 scene
// roles × 4 takes per look, resolved through `resolveGroundLayers` so admin
// replacements, tuning and AI backdrops all land on the same plane. Social
// posts used to paint only a division aura, so a kit built from the same look
// as the deck did not look like it.
//
// This module is the bridge. It is pure data: given a look code (S01–S28,
// R01–R30, a published custom C-code or a `tpl-…`/`skin-…` pack id) and a
// module, it answers with the exact CSS layer stack the slide stage would paint
// for the matching scene — no new artwork, no reinterpretation.
// -----------------------------------------------------------------------------

import { stylePackFromSkin } from "./design-skin-pack";
import { skinByCode } from "./skin-backdrop-prompt";
import { SKIN_SCENES, sceneFromSeed, type SkinScene } from "./skin-backgrounds";
import { authoredGround, resolveGroundLayers } from "./template-background";
import { stylePackById, withOverrides, type StylePack } from "./style-packs";

export interface SocialGroundLook {
  /** Normalised look code, e.g. "S12", "R04", "C01". */
  code: string;
  pack: StylePack;
}

/** Normalise anything a caller may hold onto into a bare look code. */
export function socialLookCode(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  const stripped = raw.replace(/^(skin|tpl)-/i, "");
  return stripped.toUpperCase();
}

/** Resolve a look code to its style pack, with overrides/replacements applied. */
export function socialGroundLook(input: string | null | undefined): SocialGroundLook | null {
  const code = socialLookCode(input);
  if (!code) return null;
  const skin = skinByCode(code);
  if (skin) return { code, pack: withOverrides(stylePackFromSkin(skin), code) };
  const pack =
    stylePackById(`tpl-${code.toLowerCase()}`) ??
    stylePackById(`skin-${code.toLowerCase()}`) ??
    stylePackById(code.toLowerCase());
  return pack ? { code, pack } : null;
}

/**
 * Which scene role a print/social module belongs to. A social post is a single
 * frame, so the module's own subject decides the scene the same way a slide's
 * section does.
 */
export const SOCIAL_FAMILY_SCENE: Record<string, SkinScene> = {
  hero: "cover",
  stats: "stats",
  quote: "quote",
  "logo-grid": "bento",
  "feature-list": "agenda",
  narrative: "statement",
  table: "chart",
  device: "split",
  expertise: "section",
  contact: "closing",
};

/** Scene role for one module (family first, then the module id as a seed). */
export function socialGroundScene(
  family: string | null | undefined,
  moduleId?: string | null,
): SkinScene {
  if (family && SOCIAL_FAMILY_SCENE[family]) return SOCIAL_FAMILY_SCENE[family]!;
  if (moduleId && (SKIN_SCENES as readonly string[]).includes(moduleId))
    return moduleId as SkinScene;
  return sceneFromSeed(moduleId ?? "cover");
}

/**
 * The look's ground layers for one scene, in CSS `background` shorthand order
 * (front layer first) — exactly what the slide stage paints.
 */
export function socialGroundLayers(
  look: SocialGroundLook,
  scene: SkinScene,
  take = 0,
): string[] {
  const seed = `scene:${scene} take:${take}`;
  return resolveGroundLayers(
    authoredGround(look.pack),
    look.code,
    seed,
    look.pack.tokens.surface,
  );
}

export interface SocialGroundPlate {
  /** Ready-to-use CSS `background` value. */
  background: string;
  /** Flat paper colour behind the layers. */
  surface: string;
  /** Face the look itself is authored in. */
  mode: "light" | "dark";
  scene: SkinScene;
  code: string;
}

/** One call for the frame: look code + module → the plate it should paint. */
export function socialGroundPlate(
  lookCode: string | null | undefined,
  family: string | null | undefined,
  moduleId?: string | null,
  take = 0,
): SocialGroundPlate | null {
  const look = socialGroundLook(lookCode);
  if (!look) return null;
  const scene = socialGroundScene(family, moduleId);
  const layers = socialGroundLayers(look, scene, take);
  if (!layers.length) return null;
  return {
    background: layers.join(", "),
    surface: look.pack.tokens.surface,
    mode: look.pack.mode === "dark" ? "dark" : "light",
    scene,
    code: look.code,
  };
}
