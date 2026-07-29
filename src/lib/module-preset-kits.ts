// Registry of "preset kits" that live inside the Module Library (Atlas), not
// as team templates. Each kit is a curated collection of slides mapped onto
// existing module variants — imported into the module library so users can
// browse them alongside the taxonomy and drop a whole kit into a new deck.
import type { TemplatePayload } from "./deck-store";
import { SQUARE_IMAGE_TEMPLATE } from "./imported-templates/square-image";
import { INFOGRAPHICS_IMAGES_TEMPLATE } from "./imported-templates/infographics-images";
import { GRAPH_LIBRARY_TEMPLATE } from "./imported-templates/graph-library";
import {
  validateKitPayload,
  formatKitValidationError,
  type KitValidationResult,
} from "./kit-validation";
import { SECTION_FRAMEWORKS, MODULE_VARIANTS, byId } from "./taxonomy";

/**
 * Auto-remap slide sectionIds so each slide's section permits its variant's
 * family. Preset kits were authored before the section-family whitelist
 * tightened; this normalizes them at load-time so validation is clean and
 * kits still drop into the correct section on import.
 */
function normalizeKitPayload(payload: TemplatePayload): TemplatePayload {
  const familyToSection = new Map<string, string>();
  for (const s of SECTION_FRAMEWORKS) {
    for (const f of s.permittedFamilyIds) {
      if (!familyToSection.has(f)) familyToSection.set(f, s.id);
    }
  }
  return {
    ...payload,
    slides: payload.slides.map((slide) => {
      const section = byId(SECTION_FRAMEWORKS, slide.sectionId);
      const variant = byId(MODULE_VARIANTS, slide.variantId);
      if (!section || !variant) return slide;
      if (section.permittedFamilyIds.includes(variant.familyId)) return slide;
      const remapped = familyToSection.get(variant.familyId);
      return remapped ? { ...slide, sectionId: remapped } : slide;
    }),
  };
}

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
    payload: normalizeKitPayload(SQUARE_IMAGE_TEMPLATE),
  },
  {
    key: "infographics-images",
    title: "Infographics with Images · Data Library",
    tag: "Data",
    blurb:
      "20 modular infographic layouts — 2/3/4-point splits, matrix, bento, funnels, journey maps, KPI dashboard and stat grids.",
    payload: normalizeKitPayload(INFOGRAPHICS_IMAGES_TEMPLATE),
  },
  {
    key: "graph-library",
    title: "Graph Variants · Data Library",
    tag: "Charts",
    blurb:
      "16 chart-driven proof slides — year series, axis + category bars, stacked bars, area stack, waterfall, bubble, heatmap, treemap, donut, rings, combo — each with editable data.",
    payload: normalizeKitPayload(GRAPH_LIBRARY_TEMPLATE),
  },
  {
    key: "community-event",
    title: "Community Event · Pulse Fest Kit",
    tag: "Event",
    blurb:
      "Imported event deck — covers, agenda, speaker bios, program grid, sponsor logos, quote posters, and closing CTA slides.",
    payload: normalizeKitPayload(COMMUNITY_EVENT_TEMPLATE),
  },
];

/** Validate a kit's slides against SECTION_FRAMEWORKS permitted families. */
export function validateKit(kit: ModulePresetKit): KitValidationResult {
  return validateKitPayload(kit.payload);
}

// Dev-time integrity check — surface mismatches in the registry loudly.
if (import.meta.env.DEV) {
  for (const kit of MODULE_PRESET_KITS) {
    const result = validateKit(kit);
    if (!result.valid) {
      console.warn("[module-preset-kits] " + formatKitValidationError(kit.title, result));
    }
  }
}
