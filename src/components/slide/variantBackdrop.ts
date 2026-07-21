import type { ModuleVariant } from "@/lib/taxonomy";
import type { SlideBackdrop } from "./SlideChrome";
import { getDivisionImagery } from "@/assets/backdrops/divisions";

import portrait1 from "@/assets/portraits/portrait-1.png";
import portrait2 from "@/assets/portraits/portrait-2.png";
import portrait3 from "@/assets/portraits/portrait-3.png";
import portrait4 from "@/assets/portraits/portrait-4.png";

// Master TransPerfect / Corporate dark-mode backdrop set — 10 curated
// on-brand gradient stills. Applied deterministically per variant id so a
// given variant always renders with the same backdrop across every surface
// (library grid, lightbox, editor, present, print, share).
import corp01 from "@/assets/backdrops/corporate-dark/bg-01.png.asset.json";
import corp02 from "@/assets/backdrops/corporate-dark/bg-02.png.asset.json";
import corp03 from "@/assets/backdrops/corporate-dark/bg-03.png.asset.json";
import corp04 from "@/assets/backdrops/corporate-dark/bg-04.png.asset.json";
import corp05 from "@/assets/backdrops/corporate-dark/bg-05.png.asset.json";
import corp06 from "@/assets/backdrops/corporate-dark/bg-06.png.asset.json";
import corp07 from "@/assets/backdrops/corporate-dark/bg-07.png.asset.json";
import corp08 from "@/assets/backdrops/corporate-dark/bg-08.png.asset.json";
import corp09 from "@/assets/backdrops/corporate-dark/bg-09.png.asset.json";
import corp10 from "@/assets/backdrops/corporate-dark/bg-10.png.asset.json";

export const CORPORATE_DARK_BACKDROPS: string[] = [
  corp01.url, corp02.url, corp03.url, corp04.url, corp05.url,
  corp06.url, corp07.url, corp08.url, corp09.url, corp10.url,
];

const PORTRAITS = [portrait1, portrait2, portrait3, portrait4];

/** Returns the deterministic corporate-dark backdrop URL for a variant id. */
export function pickCorporateDarkBackdrop(variantId: string): string {
  return CORPORATE_DARK_BACKDROPS[hashStr(variantId) % CORPORATE_DARK_BACKDROPS.length];
}

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
  return _computeBackdrop(variant, brandId, mode);
}

function _computeBackdrop(
  variant: ModuleVariant,
  brandId: string = "bm-enterprise",
  mode: "light" | "dark" = "dark",
): SlideBackdrop | null {

  const id = variant.id;
  const seed = hashStr(id);
  const set = getDivisionImagery(brandId);
  const photos = set.photos;
  const abstracts = set.abstracts;

  // Master TransPerfect / Corporate brand in dark mode uses the curated
  // on-brand gradient set. Only affects bm-enterprise + dark — other
  // divisions (Life Sci, Legal, Media, Digital, Gaming, GlobalLink,
  // DataForce, Trial Interactive) keep their existing division imagery.
  const useCorporateDark = mode === "dark" && brandId === "bm-enterprise";
  const corporateBg = useCorporateDark ? pickCorporateDarkBackdrop(id) : null;

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
