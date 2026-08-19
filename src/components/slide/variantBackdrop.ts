import type { ModuleVariant } from "@/lib/taxonomy";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SlideBackdrop } from "./SlideChrome";
import { getDivisionImagery, hasOwnBackdropPool } from "@/assets/backdrops/divisions";

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

// TP Media — 6 curated dark-mode gradient stills (navy + magenta/lavender).
import media01 from "@/assets/backdrops/tp-media-dark/bg-01.webp";
import media02 from "@/assets/backdrops/tp-media-dark/bg-02.webp";
import media03 from "@/assets/backdrops/tp-media-dark/bg-03.webp";
import media04 from "@/assets/backdrops/tp-media-dark/bg-04.webp";
import media05 from "@/assets/backdrops/tp-media-dark/bg-05.webp";
import media06 from "@/assets/backdrops/tp-media-dark/bg-06.webp";

// TP Games — 10 curated dark-mode aurora stills (navy + emerald/aqua).
// bg-01..06 are the base uploads; bg-07..10 are same-palette remixes
// (mirrored/flipped) so we always have enough distinct backdrops across the
// full ~60-variant module library without repeating.
import games01 from "@/assets/backdrops/tp-games-dark/bg-01.webp";
import games02 from "@/assets/backdrops/tp-games-dark/bg-02.webp";
import games03 from "@/assets/backdrops/tp-games-dark/bg-03.webp";
import games04 from "@/assets/backdrops/tp-games-dark/bg-04.webp";
import games05 from "@/assets/backdrops/tp-games-dark/bg-05.webp";
import games06 from "@/assets/backdrops/tp-games-dark/bg-06.webp";
import games07 from "@/assets/backdrops/tp-games-dark/bg-07.webp";
import games08 from "@/assets/backdrops/tp-games-dark/bg-08.webp";
import games09 from "@/assets/backdrops/tp-games-dark/bg-09.webp";
import games10 from "@/assets/backdrops/tp-games-dark/bg-10.webp";

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

export const TP_MEDIA_DARK_BACKDROPS: string[] = [
  media01,
  media02,
  media03,
  media04,
  media05,
  media06,
];

export const TP_GAMES_DARK_BACKDROPS: string[] = [
  games01,
  games02,
  games03,
  games04,
  games05,
  games06,
  games07,
  games08,
  games09,
  games10,
];

const PORTRAITS = [portrait1, portrait2, portrait3, portrait4];

/** Returns the deterministic corporate-dark backdrop URL for a variant id. */
export function pickCorporateDarkBackdrop(variantId: string): string {
  return CORPORATE_DARK_BACKDROPS[hashStr(variantId) % CORPORATE_DARK_BACKDROPS.length];
}

/** Returns the deterministic TP Media dark backdrop URL for a variant id. */
export function pickTpMediaDarkBackdrop(variantId: string): string {
  return TP_MEDIA_DARK_BACKDROPS[hashStr(variantId) % TP_MEDIA_DARK_BACKDROPS.length];
}

/** Returns the deterministic TP Games dark backdrop URL for a variant id. */
export function pickTpGamesDarkBackdrop(variantId: string): string {
  return TP_GAMES_DARK_BACKDROPS[hashStr(variantId) % TP_GAMES_DARK_BACKDROPS.length];
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

  // Resolve brand tokens so we can honor each division's own surface color
  // as the aurora base tint in light mode (instead of forcing white).
  const brand = BRAND_MODES.find((b) => b.id === brandId);
  const surface = brand?.tokens.surface ?? "#FFFFFF";

  // ── Brand-swap integrity guard ──────────────────────────────────────────
  // Raster stills carry a baked palette. If the active brand does not own a
  // palette-matched pool (Life Sciences, Trial Interactive, Product, Co-brand),
  // never borrow another division's artwork: render the brand-derived aurora so
  // the backdrop reskins with the accent tokens on every swap.
  if (!hasOwnBackdropPool(brandId)) {
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }

  // Curated PNG backdrop sets — Corporate, TP Media, TP Gaming (dark only).
  const useCorporateDark = mode === "dark" && brandId === "bm-enterprise";
  const useMediaDark = mode === "dark" && brandId === "bm-tp-media";
  const useGamesDark = mode === "dark" && brandId === "bm-tp-games";
  const hasCuratedDarkSet = useCorporateDark || useMediaDark || useGamesDark;

  // ── Aurora backdrop (Flagship 2026, "Aesop" spec) ───────────────────────
  // A curated set of hero variants renders on the procedural AuroraLayer.
  // Dark mode: navy field + 3 soft orbs derived from the brand's own primary,
  // accent, and a computed sibling hue — so Corporate stays blue, Life Sci
  // teal, Legal gold, Media magenta, Gaming emerald+aqua, etc.
  // Light mode: brand-surface field with the same brand-derived orbs at low
  // opacity (the "light aura" wash), so every division keeps its accent
  // signature regardless of theme.
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
    // Dark mode with a curated approved backdrop set (Corporate / TP Media /
    // TP Gaming): use the approved still instead of the procedural aurora, so
    // every module — heroes included — ships on an approved background.
    if (mode === "dark" && hasCuratedDarkSet) {
      const heroBg = useCorporateDark
        ? pickCorporateDarkBackdrop(id)
        : useMediaDark
          ? pickTpMediaDarkBackdrop(id)
          : pickTpGamesDarkBackdrop(id);
      return {
        url: heroBg,
        scrim: "left",
        scrimStrength: 0.7,
        imageDim: 0.08,
        tint: "#03002C",
      };
    }
    // Hero variants otherwise aurora — honor the brand's own surface color as
    // the light-mode base so the hero doesn't break the deck's surface tint.
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }


  // Default aurora wash — extends the per-division accent signature to every
  // slide when the brand+mode has no curated PNG set. Applies to:
  //   • All divisions in light mode (except curated ones, currently none)
  //   • Non-Corporate/Media/Gaming divisions in dark mode
  if (!hasCuratedDarkSet) {
    return mode === "dark"
      ? { aurora: true, auroraSeed: id, darkChrome: true, tint: "#03002C" }
      : { aurora: true, auroraSeed: id, darkChrome: false, tint: surface };
  }

  // Curated PNG-backdrop path — Corporate, TP Media (magenta/lavender), and
  // TP Gaming (emerald/aqua aurora stills) each ship a hand-picked set of
  // dark-mode gradients. Deterministic per variant id.
  const corporateBg = useCorporateDark
    ? pickCorporateDarkBackdrop(id)
    : useMediaDark
      ? pickTpMediaDarkBackdrop(id)
      : useGamesDark
        ? pickTpGamesDarkBackdrop(id)
        : null;

  const pickPhoto = (offset = 0) => corporateBg ?? photos[(seed + offset) % photos.length];
  const pickAbstract = (offset = 0) => corporateBg ?? abstracts[(seed + offset) % abstracts.length];
  const pickPortrait = () => corporateBg ?? PORTRAITS[seed % PORTRAITS.length];

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
