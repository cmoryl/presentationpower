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