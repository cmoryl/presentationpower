/**
 * ELEMENT SCENE ART — the authored KO Power background set for the Element
 * system skins.
 *
 * Eleven slide types × light/dark, authored 16:9 at 1920 with deliberate grain
 * (flat fields band on projectors). These are complete compositions, so they
 * REPLACE the generated CSS ground for the Element skins rather than sitting
 * behind it:
 *
 *   S29 → Element System (light)
 *   S30 → Element System Dark
 *
 * An admin background upload for a given scene still wins: when an override
 * carries its own `imageUrl`, the authored plate steps aside so the tuner's
 * artwork is the one that paints.
 *
 * Palette: Blue #135CFB · Teal #08BFC1 · Navy #073091 · Coral #FC5950 ·
 *          Violet #7C4EF4 · Ink #0D131D
 */

import { sceneFromSeed, type SkinScene } from "./skin-backgrounds";
import { overrideFor } from "./template-registry";
import type { StylePack } from "./style-packs";

export type ElementArtMode = "light" | "dark";

// CDN pointers written by lovable-assets (src/assets/element-bg/*.asset.json).
// Inlined as plain strings: this module is reachable from config-time code, and
// JSON imports through the `@/` alias don't resolve in that graph.
const CDN = "/__l5e/assets-v1";

const LIGHT: Record<SkinScene, string> = {
  cover: `${CDN}/7fba8abb-dde7-4bfb-92ea-d5115d83c569/element-light-cover.png`,
  agenda: `${CDN}/eb878d0c-3207-4ce9-a2fd-875592d9acd8/element-light-agenda.png`,
  statement: `${CDN}/36a414e1-172e-4a46-92e4-3edbef364d65/element-light-statement.png`,
  stats: `${CDN}/0348142d-8ea9-479a-9799-5876f89c5faa/element-light-stats.png`,
  split: `${CDN}/9496f1fa-6a16-4c01-a299-57d09f999d86/element-light-split.png`,
  bento: `${CDN}/1943235c-81ff-4952-865e-7e69535406cd/element-light-bento.png`,
  chart: `${CDN}/becc3e0d-0026-4ae0-9515-322c5a817ac4/element-light-chart.png`,
  quote: `${CDN}/36a90f16-4dda-4df1-aaf9-03a74b82408e/element-light-quote.png`,
  timeline: `${CDN}/c29b2237-2272-41ca-9597-5ace8b0f9591/element-light-timeline.png`,
  closing: `${CDN}/bad80823-9d64-48cf-bdaf-cf44af0418ef/element-light-closing.png`,
  section: `${CDN}/337caacf-97b1-487d-80b2-17fcce4e8df2/element-light-section.png`,
};

const DARK: Record<SkinScene, string> = {
  cover: `${CDN}/9e77308a-f723-4d55-b65a-084ee04b2c6f/element-dark-cover.png`,
  agenda: `${CDN}/1441013b-cd39-437f-ad98-cf4202ea4882/element-dark-agenda.png`,
  statement: `${CDN}/0f6ae797-9a86-4716-b7f0-332c177d032a/element-dark-statement.png`,
  stats: `${CDN}/a5bbee19-d48b-4467-95e6-015828cc3e4c/element-dark-stats.png`,
  split: `${CDN}/ddd5cd16-f7b6-41d1-80da-9ce091a7bde5/element-dark-split.png`,
  bento: `${CDN}/f59b9df1-0f50-4283-ae9e-030bec579df6/element-dark-bento.png`,
  chart: `${CDN}/37b54a91-651b-449e-9b31-369e59af36e2/element-dark-chart.png`,
  quote: `${CDN}/7e07438d-40be-479b-98e1-3ac027ca84dd/element-dark-quote.png`,
  timeline: `${CDN}/a9e42c02-eb07-4ca9-9738-877064e09144/element-dark-timeline.png`,
  closing: `${CDN}/a569cc15-711d-43ec-956b-7025c9f05e3b/element-dark-closing.png`,
  section: `${CDN}/33920940-19e3-4d32-831f-e0afc22d110a/element-dark-section.png`,
};


/** Which Element skins carry authored plates, and in which tonality. */
export const ELEMENT_ART_MODE: Record<string, ElementArtMode> = {
  S29: "light",
  S30: "dark",
};

/** True when this admin tuning code paints from the authored Element set. */
export function hasElementSceneArt(code: string | null | undefined): boolean {
  return !!code && !!ELEMENT_ART_MODE[code.toUpperCase()];
}

/** The authored plate URL for one scene, or null when the code isn't Element. */
export function elementSceneArtUrl(
  code: string | null | undefined,
  scene: SkinScene,
): string | null {
  const mode = code ? ELEMENT_ART_MODE[code.toUpperCase()] : undefined;
  if (!mode) return null;
  return (mode === "dark" ? DARK : LIGHT)[scene] ?? null;
}

/** Every plate in one tonality — used by the tuner filmstrip and previews. */
export function elementSceneArtSet(mode: ElementArtMode): Record<SkinScene, string> {
  return mode === "dark" ? { ...DARK } : { ...LIGHT };
}

/**
 * Wrap a pack so the authored Element plate paints as its ground.
 *
 * The plate is the sole layer: it already carries the field, the grain and the
 * scene's accent module, so stacking the generated CSS geometry on top would
 * only muddy it. Admin uploads for a scene take precedence and short-circuit.
 */
export function withElementSceneArt(pack: StylePack, code: string): StylePack {
  const mode = code ? ELEMENT_ART_MODE[code.toUpperCase()] : undefined;
  if (!mode) return pack;
  const base = pack.ground;
  // The plates carry large saturated fields. A tonal veil sits between the art
  // and the slide content so headlines, stats and cards stay legible while the
  // composition still reads through.
  const veil =
    mode === "dark"
      ? "linear-gradient(0deg, rgba(13,19,29,0.62), rgba(13,19,29,0.62))"
      : "linear-gradient(0deg, rgba(255,255,255,0.68), rgba(255,255,255,0.68))";
  return {
    ...pack,
    ground: (seed: string) => {
      const scene = sceneFromSeed(seed);
      const custom = overrideFor(code, scene);
      if (custom?.imageUrl) return base(seed);
      const url = elementSceneArtUrl(code, scene);
      if (!url) return base(seed);
      return [veil, `url("${url}") center center / cover no-repeat`];
    },
  };
}

