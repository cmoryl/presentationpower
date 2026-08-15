// -----------------------------------------------------------------------------
// AI BACKDROP ART DIRECTION
//
// Every design skin (catalog language S01–S28 and industry signature R01–R30)
// already carries written art direction: a reference, an imagery note, a
// surface note, a five-stop palette, a motif family and a geometry signature.
// This module turns that DNA into one deterministic image prompt per
// skin × scene, so a generated backdrop looks like *that* skin for *that*
// industry rather than generic stock atmosphere.
//
// Prompts are built client-safe (pure data, no server imports) so the picker
// can show exactly what will be generated before spending a credit.
// -----------------------------------------------------------------------------

import { DESIGN_SKINS, type DesignSkin } from "./design-skins";
import { INDUSTRY_SKINS, INDUSTRY_DETAIL, recipeIdForSkin } from "./industry-skins";
import { MOTIF_LABEL, motifFamilyFor, type SkinScene } from "./skin-backgrounds";
import { packGeometry, SCAFFOLD_LABEL, SHAPE_LABEL } from "./pack-geometry";
import { stylePackFromSkin } from "./design-skin-pack";

/** Every skin the backdrop studio can generate for. */
export function allBackdropSkins(): DesignSkin[] {
  return [...DESIGN_SKINS, ...INDUSTRY_SKINS];
}

export function skinByCode(code: string | null | undefined): DesignSkin | null {
  if (!code) return null;
  return allBackdropSkins().find((s) => s.code === code) ?? null;
}

/** How each scene wants its open space composed. */
const SCENE_DIRECTION: Record<SkinScene, string> = {
  cover: "a monumental opening frame; the left third stays almost empty for a large title",
  agenda: "a calm ruled field; the right half stays quiet for a numbered list",
  statement: "one commanding gesture with a wide clear centre for a single sentence",
  stats: "a low horizon with an empty band across the lower third for metric tiles",
  split: "a vertical division: one side textured, the other side clean and flat",
  bento: "a soft grid of light with an unobstructed centre for stacked tiles",
  chart: "a recessive ground with an empty rectangle in the middle for a plotted chart",
  quote: "an intimate, close-tone field with generous silence around the centre",
  timeline: "a horizontal drift of light reading left to right, empty across the middle band",
  closing: "a resolving, darker-to-lighter field with clear space at the centre",
  section: "a bold divider field: heavy on one edge, empty across the opposite two thirds",
};

/** Photographic / illustrative register implied by the motif family. */
const MOTIF_RENDER: Record<string, string> = {
  atmospheric: "soft volumetric light, long exposure haze, no hard subject",
  architectural: "abstract architectural planes and shadow edges, concrete and glass",
  editorial: "printed-paper texture, ink density, hand-set rules",
  botanical: "macro organic forms, leaf and fibre structure, natural shade",
  geological: "stone strata, mineral grain, sediment banding",
  industrial: "brushed metal, machined surfaces, oiled precision",
  clinical: "clean laboratory light, matte white surfaces, calibrated instruments",
  cartographic: "topographic contour, survey linework, aerial abstraction",
  luminous: "specular bloom, refracted colour, glass caustics",
  textile: "woven fibre, dyed cloth, thread structure",
  optical: "moiré interference, lens diffraction, prismatic banding",
  kinetic: "motion trails, directional blur, energy vectors",
  monumental: "vast scale, single mass, sculptural silhouette",
  aquatic: "water surface, caustic light, dissolved depth",
  celestial: "deep field, particulate stars, orbital arcs",
  archival: "aged paper, ledger tone, faded stamps",
  crystalline: "faceted structure, sharp planar reflection",
  terrain: "aerial land pattern, field boundaries, erosion",
};

export interface BackdropPromptSpec {
  skinCode: string;
  scene: SkinScene;
  /** The full prompt sent to the image model. */
  prompt: string;
  /** Short human-readable summary of the art direction. */
  summary: string;
  palette: string[];
}

/**
 * Build the deterministic art-direction prompt for one skin × scene.
 *
 * The prompt names the skin's palette in hex, its motif render register, its
 * geometry language, the industry's own subject matter (for R-skins) and the
 * scene's open-space contract — so the generated frame is unique per skin and
 * still leaves the reading area clear.
 */
export function backdropPrompt(skin: DesignSkin, scene: SkinScene): BackdropPromptSpec {
  const pack = stylePackFromSkin(skin);
  const geo = packGeometry(pack);
  const motif = motifFamilyFor(skin);
  const render = MOTIF_RENDER[motif] ?? "abstract designed light";
  const recipeId = recipeIdForSkin(skin);
  const detail = recipeId ? INDUSTRY_DETAIL[recipeId] : undefined;
  const [field, ink, a1, a2, a3] = skin.palette;

  const sector = detail
    ? `Sector subject matter: ${skin.name} — ${detail.imagery.toLowerCase()}; ${detail.surfaceNote.toLowerCase()}.`
    : `Design reference: ${skin.reference}. ${skin.description}`;

  const prompt = [
    `Art-directed abstract presentation backdrop, 16:9, ${skin.mode} mode.`,
    `Design language: ${skin.name} (${MOTIF_LABEL[motif] ?? motif}) — ${render}.`,
    sector,
    `Imagery note: ${skin.imagery}. Surface: ${skin.surfaceNote}.`,
    `Strict palette, no other hues: page field ${field}, ink ${ink}, accents ${a1}, ${a2}, ${a3}.`,
    `Geometry echo: ${SCAFFOLD_LABEL[geo.scaffold] ?? geo.scaffold} structure with ${SHAPE_LABEL[geo.shape] ?? geo.shape} forms, very subtle.`,
    `Composition: ${SCENE_DIRECTION[scene]}.`,
    `Museum-grade, custom designed, editorial quality. Absolutely no text, letters, numbers, logos, watermarks, people, UI, charts or slide furniture. Low visual noise in the reading area, high craft at the edges.`,
  ].join(" ");

  return {
    skinCode: skin.code,
    scene,
    prompt,
    summary: `${skin.name} · ${MOTIF_LABEL[motif] ?? motif} · ${scene}`,
    palette: skin.palette,
  };
}

export function backdropPromptForCode(
  code: string,
  scene: SkinScene,
): BackdropPromptSpec | null {
  const skin = skinByCode(code);
  return skin ? backdropPrompt(skin, scene) : null;
}
