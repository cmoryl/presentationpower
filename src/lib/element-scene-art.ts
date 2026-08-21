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

import lightAgenda from "@/assets/element-bg/light-agenda.png.asset.json";
import lightBento from "@/assets/element-bg/light-bento.png.asset.json";
import lightChart from "@/assets/element-bg/light-chart.png.asset.json";
import lightClosing from "@/assets/element-bg/light-closing.png.asset.json";
import lightCover from "@/assets/element-bg/light-cover.png.asset.json";
import lightQuote from "@/assets/element-bg/light-quote.png.asset.json";
import lightSection from "@/assets/element-bg/light-section.png.asset.json";
import lightSplit from "@/assets/element-bg/light-split.png.asset.json";
import lightStatement from "@/assets/element-bg/light-statement.png.asset.json";
import lightStats from "@/assets/element-bg/light-stats.png.asset.json";
import lightTimeline from "@/assets/element-bg/light-timeline.png.asset.json";

import darkAgenda from "@/assets/element-bg/dark-agenda.png.asset.json";
import darkBento from "@/assets/element-bg/dark-bento.png.asset.json";
import darkChart from "@/assets/element-bg/dark-chart.png.asset.json";
import darkClosing from "@/assets/element-bg/dark-closing.png.asset.json";
import darkCover from "@/assets/element-bg/dark-cover.png.asset.json";
import darkQuote from "@/assets/element-bg/dark-quote.png.asset.json";
import darkSection from "@/assets/element-bg/dark-section.png.asset.json";
import darkSplit from "@/assets/element-bg/dark-split.png.asset.json";
import darkStatement from "@/assets/element-bg/dark-statement.png.asset.json";
import darkStats from "@/assets/element-bg/dark-stats.png.asset.json";
import darkTimeline from "@/assets/element-bg/dark-timeline.png.asset.json";

export type ElementArtMode = "light" | "dark";

const LIGHT: Record<SkinScene, string> = {
  cover: lightCover.url,
  agenda: lightAgenda.url,
  statement: lightStatement.url,
  stats: lightStats.url,
  split: lightSplit.url,
  bento: lightBento.url,
  chart: lightChart.url,
  quote: lightQuote.url,
  timeline: lightTimeline.url,
  closing: lightClosing.url,
  section: lightSection.url,
};

const DARK: Record<SkinScene, string> = {
  cover: darkCover.url,
  agenda: darkAgenda.url,
  statement: darkStatement.url,
  stats: darkStats.url,
  split: darkSplit.url,
  bento: darkBento.url,
  chart: darkChart.url,
  quote: darkQuote.url,
  timeline: darkTimeline.url,
  closing: darkClosing.url,
  section: darkSection.url,
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
  if (!hasElementSceneArt(code)) return pack;
  const base = pack.ground;
  return {
    ...pack,
    ground: (seed: string) => {
      const scene = sceneFromSeed(seed);
      const custom = overrideFor(code, scene);
      if (custom?.imageUrl) return base(seed);
      const url = elementSceneArtUrl(code, scene);
      if (!url) return base(seed);
      return [`url("${url}") center center / cover no-repeat`];
    },
  };
}
