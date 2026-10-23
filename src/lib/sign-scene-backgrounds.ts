// Scene photograph backgrounds offered in the sign editor's Background
// section, per layout. Each scene is a full-bleed JPEG in public/downloads,
// designed with a calm centre so live pieces (badge, headline, QR) stay
// readable on top. RGB only; CMYK stays opt-in per the print contract.

import hiramRoofline from "@/assets/sjb-flyer/bg-hiram-roofline-v1.jpg";
import hiramLowerSpace from "@/assets/sjb-flyer/bg-hiram-lower-space.jpg";
import hiramLeftCallouts from "@/assets/sjb-flyer/bg-hiram-left-callouts.jpg";
import hiramRightCallouts from "@/assets/sjb-flyer/bg-hiram-right-callouts.jpg";
import hiramMidbandFooter from "@/assets/sjb-flyer/bg-hiram-midband-footer.jpg";
import hiramRooflineCrowd from "@/assets/sjb-flyer/bg-hiram-roofline-crowd.jpg";
import hiramLowerCrowd from "@/assets/sjb-flyer/bg-hiram-lower-space-crowd.jpg";
import hiramLeftCrowd from "@/assets/sjb-flyer/bg-hiram-left-callouts-crowd.jpg";
import hiramRightCrowd from "@/assets/sjb-flyer/bg-hiram-right-callouts-crowd.jpg";
import hiramFooterCrowd from "@/assets/sjb-flyer/bg-hiram-midband-footer-crowd.jpg";
import hiramBowlRoar from "@/assets/sjb-flyer/bg-hiram-bowl-roar.jpg";
import hiramBowlGoldrush from "@/assets/sjb-flyer/bg-hiram-bowl-goldrush.jpg";
import hiramBowlElectric from "@/assets/sjb-flyer/bg-hiram-bowl-electric.jpg";

export type SignScene = { id: string; label: string; src: string };

const SJB = "/downloads/sjb-flyer";

/** San Juan Bowl game flyer scenes (8.5 × 11 in portrait, calm centre). */
export const SJB_FLYER_SCENES: SignScene[] = [
  { id: "hiram-bowl-roar", label: "Hiram · Bowl roar · visualisation", src: hiramBowlRoar },
  { id: "hiram-bowl-goldrush", label: "Hiram · Gold rush · visualisation", src: hiramBowlGoldrush },
  { id: "hiram-bowl-electric", label: "Hiram · Electric game night · visualisation", src: hiramBowlElectric },
  { id: "hiram-roofline-crowd", label: "Hiram · full crowd · visualisation", src: hiramRooflineCrowd },
  { id: "hiram-lower-space-crowd", label: "Hiram · full crowd & lower space · visualisation", src: hiramLowerCrowd },
  { id: "hiram-left-callouts-crowd", label: "Hiram · full crowd & left callouts · visualisation", src: hiramLeftCrowd },
  { id: "hiram-right-callouts-crowd", label: "Hiram · full crowd & right callouts · visualisation", src: hiramRightCrowd },
  { id: "hiram-midband-footer-crowd", label: "Hiram · full crowd & footer · visualisation", src: hiramFooterCrowd },
  { id: "hiram-roofline-v1", label: "Hiram roofline · visualisation", src: hiramRoofline },
  { id: "hiram-lower-space", label: "Hiram · open lower space · visualisation", src: hiramLowerSpace },
  { id: "hiram-left-callouts", label: "Hiram · left callouts · visualisation", src: hiramLeftCallouts },
  { id: "hiram-right-callouts", label: "Hiram · right callouts · visualisation", src: hiramRightCallouts },
  { id: "hiram-midband-footer", label: "Hiram · stadium band & footer · visualisation", src: hiramMidbandFooter },
  { id: "collage", label: "Torn-paper collage", src: `${SJB}/bg-collage.jpg` },
  { id: "stadium-night", label: "Stadium night", src: `${SJB}/bg-stadium-night.jpg` },
  { id: "el-morro", label: "El Morro coastline", src: `${SJB}/bg-el-morro.jpg` },
  { id: "kickoff", label: "Kickoff confetti", src: `${SJB}/bg-kickoff.jpg` },
  { id: "mural", label: "Mural sunburst", src: `${SJB}/bg-mural.jpg` },
  { id: "neon", label: "Neon kickoff", src: `${SJB}/bg-neon.jpg` },
  { id: "artdeco", label: "Art deco gold", src: `${SJB}/bg-artdeco.jpg` },
  { id: "gouache", label: "Gouache wave", src: `${SJB}/bg-gouache.jpg` },
  { id: "popart", label: "Pop-art kickoff", src: `${SJB}/bg-popart.jpg` },
  { id: "retro", label: "Retro travel poster", src: `${SJB}/bg-retro.jpg` },
  { id: "collage-qb", label: "Collage · quarterback", src: `${SJB}/bg-collage-qb.jpg` },
  { id: "collage-catch", label: "Collage · El Morro catch", src: `${SJB}/bg-collage-catch.jpg` },
  { id: "collage-gameday", label: "Collage · game day", src: `${SJB}/bg-collage-gameday.jpg` },
  { id: "collage-oldsj", label: "Collage · Old San Juan run", src: `${SJB}/bg-collage-oldsj.jpg` },
  { id: "collage-kick", label: "Collage · kickoff & flag", src: `${SJB}/bg-collage-kick.jpg` },
  { id: "collage-line", label: "Collage · line of scrimmage", src: `${SJB}/bg-collage-line.jpg` },
  { id: "collage-trophy", label: "Collage · trophy night", src: `${SJB}/bg-collage-trophy.jpg` },
  { id: "collage-spirit", label: "Collage · spirit & rainforest", src: `${SJB}/bg-collage-spirit.jpg` },
  { id: "abs-arc", label: "Abstract · gold arc", src: `${SJB}/bg-abs-arc.jpg` },
  { id: "abs-fluid", label: "Abstract · liquid wave", src: `${SJB}/bg-abs-fluid.jpg` },
  { id: "abs-speed", label: "Abstract · floodlight speed", src: `${SJB}/bg-abs-speed.jpg` },
  { id: "abs-cutout", label: "Abstract · tropical cut-outs", src: `${SJB}/bg-abs-cutout.jpg` },
  { id: "light-swiss", label: "Light · minimal sun & field", src: `${SJB}/bg-light-swiss.jpg` },
  { id: "light-beach", label: "Light · watercolour beach", src: `${SJB}/bg-light-beach.jpg` },
  { id: "light-memphis", label: "Light · confetti pop", src: `${SJB}/bg-light-memphis.jpg` },
  { id: "light-turf", label: "Light · daylight turf", src: `${SJB}/bg-light-turf.jpg` },
];

const SIGN_SCENES: Record<string, SignScene[]> = {
  "divsign-sjb-first-flyer": SJB_FLYER_SCENES,
};

/** Scene backgrounds registered for a sign layout (empty when none). */
export function signScenes(layoutId: string): SignScene[] {
  return SIGN_SCENES[layoutId] ?? [];
}

/** Resolve a saved scene pick to its registry entry. */
export function signScene(layoutId: string, id: string | null | undefined): SignScene | null {
  if (!id) return null;
  return signScenes(layoutId).find((s) => s.id === id) ?? null;
}
