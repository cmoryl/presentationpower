// Registry of "preset kits" that live inside the Module Library (Atlas), not
// as team templates. Each kit is a curated collection of slides mapped onto
// existing module variants — imported into the module library so users can
// browse them alongside the taxonomy and drop a whole kit into a new deck.
import type { TemplatePayload } from "./deck-store";
import { SQUARE_IMAGE_TEMPLATE } from "./imported-templates/square-image";
import { INFOGRAPHICS_IMAGES_TEMPLATE } from "./imported-templates/infographics-images";

export type ModulePresetKit = {
  key: string;
  title: string;
  blurb: string;
  tag: string;
  payload: TemplatePayload;
};

export const MODULE_PRESET_KITS: ModulePresetKit[] = [
  {
    key: "square-image",
    title: "Square Image · Editorial Library",
    tag: "Editorial",
    blurb:
      "18 image-forward editorial slides — cinematic covers, vertical timelines, 3/4/6-up image grids, team bios, stat callouts, quote posters, and closing agenda.",
    payload: SQUARE_IMAGE_TEMPLATE,
  },
  {
    key: "infographics-images",
    title: "Infographics with Images · Data Library",
    tag: "Data",
    blurb:
      "20 modular infographic layouts — 2/3/4-point splits, matrix, bento, funnels, journey maps, KPI dashboard and stat grids.",
    payload: INFOGRAPHICS_IMAGES_TEMPLATE,
  },
];
