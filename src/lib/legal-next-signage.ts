import { demoBoothCardUrl } from "@/lib/demo-booth-cards";
// Legal NEXT general signage templates — supplied Illustrator files, edited in
// the shared kiosk layer editor. City, date and venue facts are NOT part of
// these templates; the supplied copy is used exactly as received.

import financeDeskPreview from "@/assets/finance-pillars/reg-desk.jpg.asset.json";
import globallinkDeskPreview from "@/assets/globallink-desk/reg-desk.jpg.asset.json";
import { GLOBALLINK_PILLARS } from "@/lib/next-globallink-pillars";
import { isSignId, liveLayoutById, venueFirstFaceId, type LiveLayout } from "@/lib/next-california-kiosk-live";

type Ptr = { url: string };
const MASTERS = import.meta.glob<Ptr>(["../assets/legal-next-signage/masters/*.asset.json", "../assets/sf-screen-surrounds/masters/*.asset.json", "../assets/next-demo-booth/masters/*.asset.json", "../assets/next-lift-door/masters/*.asset.json", "../assets/globallink-pillars-sf/*.pdf.asset.json"], { eager: true, import: "default" });
const masterUrl = (file: string) => Object.entries(MASTERS).find(([k]) => k.endsWith(`/${file}.asset.json`))?.[1].url ?? null;

export type LegalSignFace = { id: string; label: string };
export type LegalSign = {
  id: string;
  title: string;
  /** Trim size in inches, as supplied. */
  size: string;
  /** Supplied Illustrator file, served byte-for-byte. */
  master: string;
  faces: LegalSignFace[];
  note?: string;
  /** Preview of the supplied design, shown on template cards. */
  preview?: string;
  /** Suggested trim sizes (inches) offered when making a new size; any size can be typed. */
  sizes?: { w: number; h: number; label: string }[];
  /** Division the sign belongs to (for the editor's Exit button). */
  division?: string;
};

const PILLAR_SIZES_IN = [
  { w: 23.5, h: 72, label: "Supplied · 23.5 × 72 in" },
  { w: 23.5, h: 84, label: "Taller · 23.5 × 84 in" },
  { w: 30, h: 96, label: "Wide · 30 × 96 in" },
  { w: 18, h: 72, label: "Slim · 18 × 72 in" },
];
const PEDESTAL_SIZES_IN = [
  { w: 15, h: 36, label: "Supplied · 15 × 36 in" },
  { w: 18, h: 42, label: "18 × 42 in" },
  { w: 24, h: 48, label: "24 × 48 in" },
  { w: 12, h: 30, label: "12 × 30 in" },
];

export const LEGAL_NEXT_SIGNS: LegalSign[] = [
  {
    id: "doors", title: "Entrance sliding doors", size: "42 × 84 in, per door", master: "EntranceSlidingDoors.ai",
    faces: [{ id: "legalnext-doors-left", label: "Door 1" }, { id: "legalnext-doors-right", label: "Door 2" }],
    note: "Built from the visible layers. The supplied OPTION 1 layer is switched off and isn't included.",
  },
  {
    id: "columns", title: "Four-sided columns", size: "41 × 81 in, per side", master: "5051_L2_MF_MetroSqaureColums.ai",
    faces: [1, 2, 3, 4].map((n) => ({ id: `legalnext-columns-side-${n}`, label: `Side ${n}` })),
  },
  { id: "foyer", title: "Foyer wall", size: "173 × 96 in", master: "5051_L2_MF_MetroFoyerWallOnTopEsc.ai", faces: [{ id: "legalnext-foyer", label: "Wall" }] },
  { id: "stairs", title: "Top of stairs", size: "33.2 × 8.1 in", master: "5051_L2_MF_TopofMetroStairs.ai", faces: [{ id: "legalnext-stairs", label: "Sign" }] },
  { id: "header", title: "Ballroom door header", size: "25.6 × 0.7 in", master: "5051_F2_MF_MetroBallDoorHeader.ai", faces: [{ id: "legalnext-header", label: "Header" }] },
];

/**
 * San Francisco breakout-room screen surrounds, rebuilt from the designer's
 * GlobalLink NEXT finals (7 Oct 2026): gradient ground + artwork pieces. The
 * red cut-line guide is dropped from print. Rooms are not assigned yet.
 */
export const SF_SCREEN_SURROUNDS: LegalSign[] = [
  {
    id: "sf-surround-three", title: "Screen surround, three sides", size: "18.9 × 11.5 in", master: "Screen_Surrounds_THREE_SIDES_template.ai",
    faces: [{ id: "sfsurround-three", label: "Surround" }],
    note: "For 2 breakout rooms. Open at the top; the screen opening is 12.5 × 6.7 in. Rooms not confirmed yet.",
  },
  {
    id: "sf-surround-all", title: "Screen surround, all sides", size: "18.9 × 12.7 in", master: "Screen_Surrounds_ALL_SIDES_template.ai",
    faces: [{ id: "sfsurround-all", label: "Surround" }],
    note: "For 1 breakout room. Full frame; the screen opening is 12.5 × 6.7 in. Room not confirmed yet.",
  },
];

/** Division desk fronts drawn by the app on a supplied template, edited live in the sign editor. */
export const DIVISION_LIVE_SIGNS: LegalSign[] = [
  {
    id: "finance-reg-desk", title: "FinanceNEXT registration desk front", size: "71.25 × 40.5 in", master: "Bar_Front_Tamplate_2026_71.25x40.5.ai",
    faces: [{ id: "divsign-finance-reg-desk", label: "Front" }],
    preview: financeDeskPreview.url,
    division: "finance",
  },
  {
    id: "globallink-reg-desk", title: "GlobalLinkNEXT registration desk front", size: "96 × 34.625 in", master: "GLNEXT_Registration_Bar_Front.ai",
    faces: [{ id: "divsign-globallink-reg-desk", label: "Front" }],
    preview: globallinkDeskPreview.url,
    division: "globallink",
  },
  // Supplied pillar and pedestal finals, split into movable pieces (6 Oct 2026).
  ...([
    ["finance-pillar-welcome", "FinanceNEXT Welcome pillar", "welcome.ai"],
    ["finance-pillar-riverside", "FinanceNEXT Riverside Ballroom pillar", "Riverside_Ballroom.ai"],
    ["finance-pillar-profile", "FinanceNEXT Lift Your Global Profile pillar", "Finance_Pillar.ai"],
    ["finance-pillar-background", "FinanceNEXT pillar background (blank)", "Pillar_Background.ai"],
  ] as const).map(([id, title, master]): LegalSign => ({
    id, title, size: "23.5 × 72 in", master, faces: [{ id: `divsign-${id}`, label: "Pillar" }], sizes: PILLAR_SIZES_IN, division: "finance",
    note: "The supplied file has no bleed, so the ground is stretched 1/8 in past the trim.",
  })),
  // GlobalLink NEXT pillars, San Francisco — supplied Canva final (8 Oct 2026), one page per pillar.
  ...GLOBALLINK_PILLARS.map((p): LegalSign => ({
    id: `globallink-pillar-${p.slug}`, title: `GlobalLinkNEXT ${p.name} pillar`, size: "23.5 × 72 in", master: "gl-pillars-san-fran-26.pdf",
    faces: [{ id: `divsign-globallink-pillar-${p.slug}`, label: "Pillar" }], sizes: PILLAR_SIZES_IN, division: "globallink", preview: p.jpg.url,
    note: p.slug === "directional"
      ? "The supplied page has the arrow and no headline. The file has no bleed, so the ground is stretched 1/8 in past the trim."
      : "The headline is live text you can retype. The file has no bleed, so the ground is stretched 1/8 in past the trim.",
  })),
  {
    id: "finance-pillar-arrow", title: "FinanceNEXT pillar arrow sign", size: "23.5 × 72 in + 23.5 × 23.8 in arrow", master: "Finance_Pillar_Arro_Sign.ai",
    faces: [{ id: "divsign-finance-pillar-arrow-pillar", label: "Pillar" }, { id: "divsign-finance-pillar-arrow-arrow", label: "Arrow" }],
    sizes: PILLAR_SIZES_IN, division: "finance",
  },
  {
    id: "globallink-pedestal", title: "GlobalLink NEXT pedestals", size: "15 × 36 in", master: "Pedestal_Template_15x36_1.ai",
    faces: [1, 2, 3].map((n) => ({ id: `divsign-globallink-pedestal-${n}`, label: `Pedestal ${n}` })),
    sizes: PEDESTAL_SIZES_IN, division: "globallink",
  },
  {
    id: "nextmart-pedestal", title: "NEXT Mart pedestal", size: "15 × 36 in", master: "NEXTMartPedestal_Template_15x36_1.ai",
    faces: [{ id: "divsign-nextmart-pedestal", label: "Pedestal" }], sizes: PEDESTAL_SIZES_IN, division: "transperfect",
  },
  {
    // Basic demo booth (from the GlobalLink Coach TV test drive file): new demos swap the top logo, wording and background.
    id: "demo-booth", title: "NEXT demo booth", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-front", label: "Front" }, { id: "divsign-transperfect-demobooth-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-right", label: "Right side" }],
    division: "transperfect",
    note: "Example built from the GlobalLink Coach demo. The TV placement box marks where the screen mounts.",
  },
  {
    id: "demo-booth-globallink-now", title: "NEXT demo booth — GlobalLink NOW", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-now-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-now-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-now-right", label: "Right side" }],
    division: "transperfect",
    note: "Variation of the Coach demo booth with GlobalLink NOW wording. The GlobalLink NOW logo hasn't been supplied yet, so the spot below the TV is empty.",
  },
  {
    id: "demo-booth-globallink-one", title: "NEXT demo booth — GlobalLink ONE", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-one-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-one-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-one-right", label: "Right side" }],
    division: "transperfect",
    note: "Variation of the Coach demo booth with GlobalLink ONE wording. The GlobalLink ONE logo hasn't been supplied yet, so the spot below the TV is empty.",
  },
  {
    id: "demo-booth-aura", title: "NEXT demo booth — TransPerfect AURA", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-aura-front", label: "Front" }, { id: "divsign-transperfect-demobooth-aura-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-aura-right", label: "Right side" }],
    division: "transperfect",
    note: "Variation of the Coach demo booth with TransPerfect AURA wording. The TransPerfect AURA logo hasn't been supplied yet, so the spot below the TV is empty.",
  },
  {
    id: "demo-booth-media", title: "NEXT demo booth — TransPerfect Media", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-media-front", label: "Front" }, { id: "divsign-transperfect-demobooth-media-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-media-right", label: "Right side" }],
    division: "transperfect",
    note: "Variation of the Coach demo booth with TransPerfect Media wording and the TransPerfect Media logo from the logo inventory (movable).",
  },
  {
    id: "demo-booth-globallink-web", title: "NEXT demo booth — GlobalLink Web", size: "45 × 96 in front + 4 × 96 in sides", master: "GLCoach_TVTestDrive_Demo_Booth.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-web-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-web-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-web-right", label: "Right side" }],
    division: "transperfect",
    note: "Variation of the Coach demo booth with GlobalLink Web wording. The GlobalLink Web logo hasn't been supplied yet, so the spot below the TV is empty.",
  },
  {
    // General NEXT lift-door wrap ("Lift your global profile"), two door leaves on one artboard.
    id: "lift-liftyour", title: "NEXT lift door wrap — Lift Your Global Profile", size: "43.3 × 82.1 in (both doors)", master: "Lifts_Template_LiftYour.ai",
    faces: [{ id: "divsign-transperfect-lift-liftyour", label: "Lift doors" }],
    division: "transperfect",
    note: "General lift template. The centre line where the doors meet is a guide and isn't printed.",
  },
];
// Demo booth cards show the left side, front and right side together.
for (const s of DIVISION_LIVE_SIGNS) if (s.id.startsWith("demo-booth")) s.preview = demoBoothCardUrl(s.id) ?? s.preview;

/** Editor id for a venue spot's first version: `venue~<spot>~<w>x<h>_<w>x<h>…` (artboard inches). */
export const venueFirstSignId = (spotId: string, artboards: { w_in: number; h_in: number }[]) =>
  `venue~${spotId.slice(0, 8)}~${artboards.map((a) => `${+a.w_in.toFixed(3)}x${+a.h_in.toFixed(3)}`).join("_")}`;

/** A submitted venue file's artboards as a first-version sign in the NEXT look (logo + arrows on the event ground). */
function venueFirstSign(id: string): LegalSign | null {
  const m = id.match(/^venue~([0-9a-f]{8})~(.+)$/);
  if (!m) return null;
  const boards = m[2]!.split("_").map((s) => s.split("x").map(Number)).filter(([w, h]) => w! >= 1 && h! >= 1 && w! <= 600 && h! <= 600);
  if (!boards.length || boards.length > 40) return null;
  return {
    id, title: "Venue spot · first version", size: boards.map(([w, h]) => `${w} × ${h} in`).join(", "), master: "",
    faces: boards.map(([w, h], i) => ({ id: venueFirstFaceId(m[1]!, i + 1, boards.length, w!, h!), label: boards.length > 1 ? `Tier ${i + 1}${i === 0 ? " (bottom)" : i === boards.length - 1 ? " (top)" : ""}` : "Artboard" })),
    note: "First version built by Element in the NEXT look on the submitted file's artboard sizes. Designer sizes, not the site survey.",
  };
}

export const legalSign = (id: string) => [...LEGAL_NEXT_SIGNS, ...SF_SCREEN_SURROUNDS, ...DIVISION_LIVE_SIGNS].find((s) => s.id === id) ?? venueFirstSign(id);
export const legalSignMasterUrl = (s: LegalSign) => masterUrl(s.master);
/** A face's layout; `faceId` may carry a size (`<face>~<w>x<h>`) for a re-sized version. */
export const legalSignLayout = (faceId: string): LiveLayout | null => (isSignId(faceId) ? liveLayoutById(faceId) ?? null : null);
