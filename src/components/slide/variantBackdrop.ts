import type { ModuleVariant } from "@/lib/taxonomy";
import type { SlideBackdrop } from "./SlideChrome";
import { getDivisionImagery } from "@/assets/backdrops/divisions";
import { LIGHT_IMAGERY, LIGHT_TINT } from "@/assets/backdrops/light";


import portrait1 from "@/assets/portraits/portrait-1.png";
import portrait2 from "@/assets/portraits/portrait-2.png";
import portrait3 from "@/assets/portraits/portrait-3.png";
import portrait4 from "@/assets/portraits/portrait-4.png";

const PORTRAITS = [portrait1, portrait2, portrait3, portrait4];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Returns a SlideBackdrop config for a variant, sourcing imagery from the
 * active brand/division's dedicated image repository. Different families get
 * different scrim treatments so each imagery pattern still reads distinctly.
 */
export function backdropForVariant(
  variant: ModuleVariant,
  brandId: string = "bm-enterprise",
  mode: "light" | "dark" = "dark",
): SlideBackdrop | null {
  const base = _computeBackdrop(variant, brandId, mode);
  if (!base) return base;
  if (mode !== "light") return base;
  // White-mode override — swap heavy dark tints for a bright white wash,
  // ease off scrim strength and dim so the near-white imagery reads as white.
  return {
    ...base,
    tint: LIGHT_TINT,
    scrimStrength: Math.min(base.scrimStrength ?? 0.6, 0.4),
    imageDim: 0,
  };
}

function _computeBackdrop(
  variant: ModuleVariant,
  brandId: string = "bm-enterprise",
  mode: "light" | "dark" = "dark",
): SlideBackdrop | null {

  const id = variant.id;
  const seed = hashStr(id);
  const isLight = mode === "light";
  const set = isLight ? LIGHT_IMAGERY : getDivisionImagery(brandId);
  const photos = set.photos;
  const abstracts = set.abstracts;

  const pickPhoto = (offset = 0) => photos[(seed + offset) % photos.length];
  const pickAbstract = (offset = 0) => abstracts[(seed + offset) % abstracts.length];
  const pickPortrait = () => PORTRAITS[seed % PORTRAITS.length];

  // Full-bleed cover / hero — division photograph, strong side scrim.
  if (/^MV-OP-COVER(-MEDIA)?$/.test(id) || id === "MV-CS-HERO" || id === "MV-CTA-CLOSING-HERO") {
    return {
      url: pickPhoto(0),
      scrim: "left",
      scrimStrength: 0.75,
      imageDim: 0.1,
      tint: "#03002C",
    };
  }

  // Minimal cover — abstract atmospheric with gentle side scrim.
  if (id === "MV-OP-COVER-MINIMAL") {
    return { url: pickAbstract(0), scrim: "left", scrimStrength: 0.65, tint: "#03002C" };
  }

  // Dividers — abstract atmospherics with full-frame vignette.
  if (/^MV-OP-DIVIDER/.test(id)) {
    return {
      url: pickAbstract(1),
      scrim: "vignette",
      scrimStrength: 0.55,
      imageDim: 0.15,
    };
  }

  // Agendas — subtle side gradient over a quieter division photo.
  if (/^MV-OP-AGENDA/.test(id)) {
    return { url: pickPhoto(1), scrim: "left", scrimStrength: 0.85, imageDim: 0.1 };
  }

  // Team bios / intro — portrait treatment layered over division photo.
  if (/BIOS|INTRO-TEAM/.test(id)) {
    return { url: pickPhoto(2), scrim: "bottom", scrimStrength: 0.7, imageDim: 0.05 };
  }

  // Case studies / testimonials — portrait with strong right scrim.
  if (/^MV-CS-/.test(id) || /TESTIMONIAL|QUOTE-BIG/.test(id)) {
    return {
      url: pickPortrait(),
      scrim: "right",
      scrimStrength: 0.8,
      imageDim: 0.05,
      tint: "#03002C",
    };
  }

  // Stats / proof / cost — division photo full-frame with heavier dim.
  if (/^MV-PROOF-|STAT-GRID|OPPORTUNITY-SIZE|MV-CTX-COST/.test(id)) {
    return { url: pickPhoto(3), scrim: "full", scrimStrength: 0.65, imageDim: 0.2 };
  }

  // Cards / pillars — abstract atmospheric with soft bottom scrim.
  if (/CARDS-|PILLARS-|PRINCIPLES|VALUE-PROPS/.test(id)) {
    return { url: pickAbstract(2), scrim: "bottom", scrimStrength: 0.75, imageDim: 0.15 };
  }

  // Timeline / roadmap / process — division photo with bottom scrim.
  if (/TIMELINE|ROADMAP|PROCESS|PHASES|JOURNEY|STEPS/.test(id)) {
    return { url: pickPhoto(4), scrim: "bottom", scrimStrength: 0.72, imageDim: 0.15 };
  }

  // Closing / CTA — abstract atmospheric leaning on brand color.
  if (/^MV-CTA-|CLOSING|NEXT-STEPS|THANKS/.test(id)) {
    return {
      url: pickAbstract(3),
      scrim: "left",
      scrimStrength: 0.8,
      imageDim: 0.05,
      tint: "#03002C",
    };
  }

  // Logos / brand strips — leave clean (no backdrop).
  if (/LOGO-STRIP|LOGOS/.test(id)) {
    return null;
  }

  // Fallback — abstract with side scrim so content stays readable.
  return { url: pickAbstract(0), scrim: "left", scrimStrength: 0.8, imageDim: 0.1 };
}
