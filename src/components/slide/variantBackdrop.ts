import type { ModuleVariant } from "@/lib/taxonomy";
import type { SlideBackdrop } from "./SlideChrome";

import portrait1 from "@/assets/portraits/portrait-1.png";
import portrait2 from "@/assets/portraits/portrait-2.png";
import portrait3 from "@/assets/portraits/portrait-3.png";
import portrait4 from "@/assets/portraits/portrait-4.png";
import ambient from "@/assets/backdrops/backdrop-ambient.jpg";
import team from "@/assets/backdrops/backdrop-team.jpg";
import city from "@/assets/backdrops/backdrop-city.jpg";
import abstractAsset from "@/assets/backdrops/backdrop-abstract.png.asset.json";
import bokehAsset from "@/assets/backdrops/backdrop-bokeh.png.asset.json";

const PORTRAITS = [portrait1, portrait2, portrait3, portrait4];
const abstract = abstractAsset.url;
const bokeh = bokehAsset.url;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Returns a SlideBackdrop config for a variant: which image sits behind the
 * content, what direction the scrim runs, and how strong the alpha overlay is.
 * Different families get different treatments so the library visibly
 * demonstrates each imagery + gradient pattern.
 */
export function backdropForVariant(variant: ModuleVariant): SlideBackdrop | null {
  const id = variant.id;
  const seed = hashStr(id);

  // Full-bleed cover / hero — portrait or scene, strong bottom scrim.
  if (/^MV-OP-COVER(-MEDIA)?$/.test(id) || id === "MV-CS-HERO" || id === "MV-CTA-CLOSING-HERO") {
    const useTeam = seed % 2 === 0;
    return {
      url: useTeam ? team : PORTRAITS[seed % PORTRAITS.length],
      scrim: "left",
      scrimStrength: 0.75,
      imageDim: 0.1,
      tint: "#03002C",
    };
  }

  // Minimal cover — soft ambient with gentle top scrim.
  if (id === "MV-OP-COVER-MINIMAL") {
    return { url: ambient, scrim: "left", scrimStrength: 0.65, tint: "#03002C" };
  }

  // Dividers — abstract/bokeh/ambient/city with full-frame vignette.
  if (/^MV-OP-DIVIDER/.test(id)) {
    const dividerImages = [abstract, bokeh, ambient, city];
    return {
      url: dividerImages[seed % dividerImages.length],
      scrim: "vignette",
      scrimStrength: 0.55,
      imageDim: 0.15,
    };
  }

  // Agendas — subtle side gradient over ambient.
  if (/^MV-OP-AGENDA/.test(id)) {
    return { url: ambient, scrim: "left", scrimStrength: 0.85, imageDim: 0.1 };
  }

  // Team bios / intro — team backdrop with left scrim.
  if (/BIOS|INTRO-TEAM/.test(id)) {
    return { url: team, scrim: "bottom", scrimStrength: 0.7, imageDim: 0.05 };
  }

  // Case studies / testimonials — portrait with strong left scrim.
  if (/^MV-CS-/.test(id) || /TESTIMONIAL|QUOTE-BIG/.test(id)) {
    return {
      url: PORTRAITS[seed % PORTRAITS.length],
      scrim: "right",
      scrimStrength: 0.8,
      imageDim: 0.05,
      tint: "#03002C",
    };
  }

  // Stats / proof / cost — city bokeh backdrop, full-frame dim.
  if (/^MV-PROOF-|STAT-GRID|OPPORTUNITY-SIZE|MV-CTX-COST/.test(id)) {
    return { url: city, scrim: "full", scrimStrength: 0.65, imageDim: 0.2 };
  }

  // Cards / pillars — abstract or ambient with soft bottom scrim.
  if (/CARDS-|PILLARS-|PRINCIPLES|VALUE-PROPS/.test(id)) {
    return { url: seed % 2 === 0 ? abstract : ambient, scrim: "bottom", scrimStrength: 0.75, imageDim: 0.15 };
  }

  // Timeline / roadmap / process — city with bottom scrim.
  if (/TIMELINE|ROADMAP|PROCESS|PHASES|JOURNEY|STEPS/.test(id)) {
    return { url: city, scrim: "bottom", scrimStrength: 0.72, imageDim: 0.15 };
  }

  // Closing / CTA — bokeh dominant (matches TransPerfect closing style), rotating in team/portraits.
  if (/^MV-CTA-|CLOSING|NEXT-STEPS|THANKS/.test(id)) {
    const closingImages = [bokeh, bokeh, team, PORTRAITS[seed % PORTRAITS.length]];
    return {
      url: closingImages[seed % closingImages.length],
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

  // Fallback — abstract or ambient with side scrim so content stays readable.
  return { url: seed % 2 === 0 ? abstract : ambient, scrim: "left", scrimStrength: 0.8, imageDim: 0.1 };
}
