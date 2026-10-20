import measurements from "./san-juan-logo-measurements.json";
import white from "@/assets/san-juan-bowl/white-underlay.svg.asset.json";
import scene from "@/assets/san-juan-bowl/badge-scene-banner.svg.asset.json";
import waves from "@/assets/san-juan-bowl/waves-sun-trim.svg.asset.json";
import sanJuan from "@/assets/san-juan-bowl/san-juan-lettering.svg.asset.json";
import bowl from "@/assets/san-juan-bowl/bowl-lettering.svg.asset.json";
import bird from "@/assets/san-juan-bowl/bird-accent.svg.asset.json";
import pack from "@/assets/san-juan-bowl/original-components.zip.asset.json";

export const SJB_MEASUREMENTS = measurements;
export const SJB_COMPONENTS = measurements.parts.map((part, index) => ({
  ...part, url: [white, scene, waves, sanJuan, bowl, bird][index]?.url ?? "",
}));
export const SJB_COMPONENT_PACK = pack.url;
export function sjbProductionSize(width: number) {
  const k = width / measurements.bounds.w;
  return { height: measurements.bounds.h * k, clearSpace: measurements.unit * k,
    artboard: measurements.artboard * k, footprintWidth: width + 2 * measurements.unit * k };
}