import measurements from "./san-juan-logo-measurements.json";
import white from "@/assets/san-juan-bowl/white-underlay.svg.asset.json";
import scene from "@/assets/san-juan-bowl/badge-scene-banner.svg.asset.json";
import waves from "@/assets/san-juan-bowl/waves-sun-trim.svg.asset.json";
import sanJuan from "@/assets/san-juan-bowl/san-juan-lettering.svg.asset.json";
import bowl from "@/assets/san-juan-bowl/bowl-lettering.svg.asset.json";
import bird from "@/assets/san-juan-bowl/bird-accent.svg.asset.json";
import pack from "@/assets/san-juan-bowl/original-components.zip.asset.json";

export const SJB_MEASUREMENTS = measurements;
/** Plain-language definition of each original drawing layer, in stacking order. */
export const SJB_SECTION_DEFINITIONS: Record<string, { role: string; detail: string; rule: string }> = {
  "white-underlay": { role: "Foundation layer", detail: "Unpainted outline paths beneath the badge that set the knock-out shape the colour sits on.", rule: "Never remove or fill in; it keeps the badge silhouette clean on every ground." },
  "badge-scene-banner": { role: "Badge and scene", detail: "The diamond badge holding El Morro fortress, palm trees, the football and the yellow TRANSPERFECT banner, drawn as one composite scene.", rule: "Treat as one unit; do not lift the fortress, palms, football or banner out on their own." },
  "waves-sun-trim": { role: "Waves, sun and lower trim", detail: "The ocean waves, sun rays and lower border that close the base of the badge.", rule: "Keep attached to the badge; at stadium scale this detail is expected to read as texture." },
  "san-juan-lettering": { role: "SAN JUAN wordmark", detail: "Custom outlined lettering naming the host city, the largest type in the mark.", rule: "Never retype in a font; reproduce only from the supplied paths." },
  "bowl-lettering": { role: "BOWL wordmark", detail: "Outlined lettering under SAN JUAN completing the event name.", rule: "Always paired with SAN JUAN at its fixed size and position." },
  "bird-accent": { role: "Bird accent", detail: "A small bird shape adding movement to the sky of the scene.", rule: "Decorative detail; never enlarge, move or use as a standalone icon." },
};

export const SJB_COMPONENTS = measurements.parts.map((part, index) => ({
  ...part, url: [white, scene, waves, sanJuan, bowl, bird][index]?.url ?? "",
  definition: SJB_SECTION_DEFINITIONS[part.id],
}));
export const SJB_COMPONENT_PACK = pack.url;
export function sjbProductionSize(width: number) {
  const k = width / measurements.bounds.w;
  return { height: measurements.bounds.h * k, clearSpace: measurements.unit * k,
    artboard: measurements.artboard * k, footprintWidth: width + 2 * measurements.unit * k };
}
import sBase from "@/assets/san-juan-bowl/scene-base.svg.asset.json";
import sSky from "@/assets/san-juan-bowl/scene-sky.svg.asset.json";
import sTrim from "@/assets/san-juan-bowl/scene-trim.svg.asset.json";
import sClouds from "@/assets/san-juan-bowl/scene-clouds.svg.asset.json";
import sFort from "@/assets/san-juan-bowl/scene-fortress.svg.asset.json";
import sBall from "@/assets/san-juan-bowl/scene-football.svg.asset.json";
import sPalmL from "@/assets/san-juan-bowl/scene-palmL.svg.asset.json";
import sPalmR from "@/assets/san-juan-bowl/scene-palmR.svg.asset.json";
import sBanner from "@/assets/san-juan-bowl/scene-banner.svg.asset.json";
import sBird from "@/assets/san-juan-bowl/scene-bird.svg.asset.json";

/**
 * The composite "Badge and scene" layer split into its elements by original path
 * (0-based path index in the full-colour master, document order). Each file keeps
 * only those paths at source coordinates — nothing redrawn. Bottom to top.
 */
export const SJB_SCENE_ELEMENTS = [
  { id: "base", name: "Badge base", detail: "Navy badge body. Also carries the dark outlines and silhouettes of the palms and fortress, so it sits under every element.", paths: [99], url: sBase.url },
  { id: "sky", name: "Sky", detail: "Sky-blue field behind the fortress, with the cut-outs for the tower and clouds.", paths: [129, 130], url: sSky.url },
  { id: "trim", name: "Gold top trim", detail: "Gold chevron border along the top of the badge.", paths: [67, 71], url: sTrim.url },
  { id: "clouds", name: "Clouds", detail: "White clouds either side of the tower.", paths: [91, 93, 94, 95], url: sClouds.url },
  { id: "fortress", name: "El Morro fortress", detail: "Tower, dome, walls, battlements and windows.", paths: [34, 35, 36, 37, 41, 42, 73, 74, 75, 76, 77, 78, 79, 80, 82, 83, 86, 87, 89, 90, 92, 97, 100, 101, 102, 103, 104, 105, 106, 111, 112, 114, 115, 117, 118, 119, 120, 121, 124, 125, 126, 127, 128], url: sFort.url },
  { id: "football", name: "Football", detail: "The ball rising behind the walls, with its laces and ground line.", paths: [39, 40, 43, 81, 84, 107, 108, 109, 110, 113, 116, 122, 123], url: sBall.url },
  { id: "palm-left", name: "Left palm", detail: "Sky-blue fronds and gold trunk highlights of the left palm.", paths: [44, 45, 46, 50, 54, 55, 56, 61, 64, 65, 68, 98], url: sPalmL.url },
  { id: "palm-right", name: "Right palm", detail: "Sky-blue fronds and gold trunk highlights of the right palm.", paths: [47, 48, 52, 53, 57, 58, 59, 60, 62, 63, 66, 96], url: sPalmR.url },
  { id: "banner", name: "TRANSPERFECT banner", detail: "Gold ribbon, sky-blue tail folds, both white stars and all twelve TRANSPERFECT letters. Twelve letters and two stars in total.", paths: [49, 51, 69, 70, 72, 85, 88, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142], url: sBanner.url },
  { id: "scene-bird", name: "Scene bird", detail: "Navy bird in the sky. Its pair is layer 6, Bird accent, drawn as a separate shape in the source file; treat both birds as one decorative pair.", paths: [38], url: sBird.url },
] as const;

export const SJB_SCENE_ELEMENT_OF: Record<number, string> = Object.fromEntries(
  SJB_SCENE_ELEMENTS.flatMap(e => e.paths.map(p => [p, e.name])),
);
