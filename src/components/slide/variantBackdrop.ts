import type { ModuleVariant } from "@/lib/taxonomy";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SlideBackdrop } from "./SlideChrome";
import { getDivisionImagery, hasOwnBackdropPool } from "@/assets/backdrops/divisions";
import { isTransPerfectBrandScope } from "@/lib/brand-profiles";

import portrait1 from "@/assets/portraits/portrait-1.webp";
import portrait2 from "@/assets/portraits/portrait-2.webp";
import portrait3 from "@/assets/portraits/portrait-3.webp";
import portrait4 from "@/assets/portraits/portrait-4.webp";

// Master TransPerfect / Corporate dark-mode backdrop set — 10 curated
// on-brand gradient stills. Applied deterministically per variant id so a
// given variant always renders with the same backdrop across every surface
// (library grid, lightbox, editor, present, print, share).
import corp01 from "@/assets/backdrops/corporate-dark/bg-01.webp";
import corp02 from "@/assets/backdrops/corporate-dark/bg-02.webp";
import corp03 from "@/assets/backdrops/corporate-dark/bg-03.webp";
import corp04 from "@/assets/backdrops/corporate-dark/bg-04.webp";
import corp05 from "@/assets/backdrops/corporate-dark/bg-05.webp";
import corp06 from "@/assets/backdrops/corporate-dark/bg-06.webp";
import corp07 from "@/assets/backdrops/corporate-dark/bg-07.webp";
import corp08 from "@/assets/backdrops/corporate-dark/bg-08.webp";
import corp09 from "@/assets/backdrops/corporate-dark/bg-09.webp";
import corp10 from "@/assets/backdrops/corporate-dark/bg-10.webp";


export const CORPORATE_DARK_BACKDROPS: string[] = [
  corp01,
  corp02,
  corp03,
  corp04,
  corp05,
  corp06,
  corp07,
  corp08,
  corp09,
  corp10,
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
  const effectiveBrandId = isTransPerfectBrandScope(brandId) ? "bm-enterprise" : brandId;
  const set = getDivisionImagery(effectiveBrandId);
  const photos = set.photos;
  const abstracts = set.abstracts;

  // TransPerfect division scope uses the approved enterprise surface; non-TP
  // product/cobrand modes can still carry their own authored surface.
  const brand = BRAND_MODES.find((b) => b.id === effectiveBrandId);
  const surface = brand?.tokens.surface ?? "#FFFFFF";

  // ── Brand-swap integrity guard ──────────────────────────────────────────
  // Raster stills carry a baked palette. For TransPerfect division scope the
  // enterprise pool is canonical; for non-TP modes without an owned pool, fall
  // back to aurora instead of borrowing a mismatched image set.
  if (!hasOwnBackdropPool(effectiveBrandId)) {
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }

  // Curated PNG backdrop set — Enterprise/corporate dark only. Division modules
  // intentionally stay on this same approved backdrop system.
  const useCorporateDark = mode === "dark" && effectiveBrandId === "bm-enterprise";
  const hasCuratedDarkSet = useCorporateDark;

  // ── Aurora backdrop (Flagship 2026, "Aesop" spec) ───────────────────────
  // A curated set of hero variants renders on the procedural AuroraLayer.
  // Dark mode: approved navy field; light mode: approved enterprise surface.
  const auroraHeroes = new Set<string>([
    "MV-INS-QUOTE",
    "MV-CASE-SPREAD",
    "MV-CASE-METRICS",
    "MV-CASE-STORY",
    "MV-PROOF-KPI",
    "MV-PROOF-STAT-GRID",
    "MV-INS-BIG-IDEA",
  ]);
  if (auroraHeroes.has(id)) {
    // Dark mode with the curated approved enterprise backdrop set: use the
    // approved still instead of procedural aurora.
    if (mode === "dark" && hasCuratedDarkSet) {
      return {
        url: pickCorporateDarkBackdrop(id),
        scrim: "left",
        scrimStrength: 0.7,
        imageDim: 0.08,
        tint: "#03002C",
      };
    }
    // Hero variants otherwise aurora — use the effective brand surface.
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }

  // Default aurora wash for modes without a curated PNG set.
  if (!hasCuratedDarkSet) {
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }

  // Curated PNG-backdrop path — enterprise dark gradients, deterministic per
  // variant id, shared by every TransPerfect division module.
  const corporateBg = useCorporateDark ? pickCorporateDarkBackdrop(id) : null;

  const pickPhoto = (offset = 0) => corporateBg ?? photos[(seed + offset) % photos.length];
  const pickAbstract = (offset = 0) => corporateBg ?? abstracts[(seed + offset) % abstracts.length];
  const pickPortrait = () => corporateBg ?? PORTRAITS[seed % PORTRAITS.length];

  // Full-bleed cover / hero — enterprise photograph, strong side scrim.
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

  // Agendas — subtle side gradient over a quieter enterprise photo.
  if (/^MV-OP-AGENDA/.test(id)) {
    return { url: pickPhoto(1), scrim: "left", scrimStrength: 0.85, imageDim: 0.1 };
  }

  // Team bios / intro — portrait treatment layered over enterprise photo.
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

  // Stats / proof / cost — enterprise photo full-frame with heavier dim.
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
