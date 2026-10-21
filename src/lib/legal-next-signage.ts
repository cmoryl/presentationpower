import { demoBoothCardUrl } from "@/lib/demo-booth-cards";
// Legal NEXT general signage templates — supplied Illustrator files, edited in
// the shared kiosk layer editor. City, date and venue facts are NOT part of
// these templates; the supplied copy is used exactly as received.

import financeDeskPreview from "@/assets/finance-pillars/reg-desk.jpg.asset.json";
import vipDinnerPreview from "@/assets/next-vip-dinner/vip-dinner.jpg.asset.json";
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
  /** Supplied event kit the sign belongs to (Exit returns to that kit). */
  kit?: string;
};

/** San Francisco lift doors, as supplied by the team (41.5 in wide, 84 in high). */
const SF_LIFT_SIZES_IN = [{ w: 41.5, h: 84, label: "San Francisco · 41.5 × 84 in" }];
export const PILLAR_SIZES_IN = [
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
    ["finance-pillar-library", "FinanceNEXT Library pillar", "Library.ai"],
    ["finance-pillar-join-library", "FinanceNEXT Join us in the Library pillar", "join_us_in_th_Library.ai"],
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
    // GlobalLink NEXT VIP dinner invitation — supplied Canva PDF Print (21 Oct 2026), 11.25 in square.
    id: "globallink-vip-dinner", title: "GlobalLink NEXT VIP dinner invitation", size: "11.25 × 11.25 in", master: "VIP_Dinner.pdf",
    faces: [{ id: "divsign-globallink-vip-dinner", label: "Invitation" }], division: "globallink", preview: vipDinnerPreview.url,
    sizes: [{ w: 11.25, h: 11.25, label: "Supplied · 11.25 × 11.25 in" }, { w: 5, h: 5, label: "Card · 5 × 5 in" }, { w: 7, h: 7, label: "Card · 7 × 7 in" }],
    note: "The date, time, event name and address are live text you can retype. The NEXT logo, \"You are invited\" script and venue logo are movable pieces; swap the venue logo for each city. The file has no bleed, so the ground is stretched 1/8 in past the trim.",
  },
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
    id: "demo-booth", title: "NEXT demo booth", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-front-final.ai",
    faces: [{ id: "divsign-transperfect-demobooth-front", label: "Front" }, { id: "divsign-transperfect-demobooth-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied GlobalLink Coach front file (updated 8 Oct). The TV guide marks where the screen mounts and is never printed.",
  },
  {
    id: "demo-booth-globallink-now", title: "NEXT demo booth — GlobalLink NOW", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-globallink-now-front-final2.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-now-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-now-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-now-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied V2 GlobalLink NOW front file; the logo is part of the artwork and can be moved or hidden.",
  },
  {
    id: "demo-booth-globallink-one", title: "NEXT demo booth — GlobalLink ONE", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-globallink-one-front-final.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-one-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-one-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-one-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied V2 GlobalLink ONE front file; the logo is part of the artwork and can be moved or hidden.",
  },
  {
    id: "demo-booth-aura", title: "NEXT demo booth — TransPerfect AURA", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-aura-front-final2.ai",
    faces: [{ id: "divsign-transperfect-demobooth-aura-front", label: "Front" }, { id: "divsign-transperfect-demobooth-aura-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-aura-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied V2 TransPerfect AURA front file; the logo is part of the artwork and can be moved or hidden.",
  },
  {
    id: "demo-booth-media", title: "NEXT demo booth — TransPerfect Media", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-media-front-final.ai",
    faces: [{ id: "divsign-transperfect-demobooth-media-front", label: "Front" }, { id: "divsign-transperfect-demobooth-media-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-media-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied V2 TransPerfect Media front file; the logo is part of the artwork and can be moved or hidden.",
  },
  {
    id: "demo-booth-globallink-web", title: "NEXT demo booth — GlobalLink Web", size: "45 × 96 in front + 4 × 96 in sides", master: "NEXT-demo-booth-globallink-web-front-final.ai",
    faces: [{ id: "divsign-transperfect-demobooth-globallink-web-front", label: "Front" }, { id: "divsign-transperfect-demobooth-globallink-web-left", label: "Left side" }, { id: "divsign-transperfect-demobooth-globallink-web-right", label: "Right side" }],
    division: "transperfect",
    note: "Built from the supplied V2 GlobalLink Web front file; the logo is part of the artwork and can be moved or hidden.",
  },
  {
    // General NEXT lift-door wrap ("Lift your global profile"), two door leaves on one artboard.
    id: "lift-liftyour", title: "NEXT lift door wrap — Lift Your Global Profile", size: "43.3 × 82.1 in (both doors)", master: "Lifts_Template_LiftYour.ai",
    faces: [{ id: "divsign-transperfect-lift-liftyour", label: "Lift doors" }],
    division: "transperfect",
    note: "General lift template. The centre line where the doors meet is a guide and isn't printed.",
    sizes: [{ w: 43.3, h: 82.1, label: "Supplied · 43.3 × 82.1 in" }, ...SF_LIFT_SIZES_IN],
  },
  // The other five London lift wraps (from the issued London pack), each as a general template plus the SF size.
  ...([
    ["stepinto", "Step Into What's NEXT"],
    ["thinkbigger", "Think Bigger. Go Further."],
    ["whereideas", "Where Ideas Connect"],
    ["elevate", "Elevate Your Global Customer Experience"],
    ["cantspell", "You Can't Spell GlobalLink Without AI"],
  ] as const).flatMap(([n, name]): LegalSign[] => [
    {
      id: `lift-${n}`, title: `NEXT lift door wrap — ${name}`, size: "43.3 × 82.1 in (both doors)", master: `Lifts_Template_${n}.ai`,
      faces: [{ id: `divsign-transperfect-lift-${n}`, label: "Lift doors" }],
      division: "transperfect",
      note: "General lift template from the London lift set. The centre line where the doors meet is a guide and isn't printed.",
      sizes: [{ w: 43.3, h: 82.1, label: "Supplied · 43.3 × 82.1 in" }, ...SF_LIFT_SIZES_IN],
    },
  ]),
  // San Francisco lifts: built from the designer's SF live files (41.5 × 84 in, both doors on one artboard, Oct 2026).
  ...([
    ["liftyour", "Lift Your Global Profile"],
    ["nextstop", "Next Stop: Beyond Intelligence"],
    ["stepinto", "Step Into What's NEXT"],
    ["thinkbigger", "Think Bigger. Go Further."],
    ["elevate", "Elevate Your Global Customer Experience"],
    ["whereideas", "Where Ideas Connect"],
    ["cantspell", "You Can't Spell GlobalLink Without AI"],
  ] as const).map(([n, name]): LegalSign => ({
    id: `sf-lift-${n}`, title: `San Francisco lift door wrap — ${name}`, size: "41.5 × 84 in (both doors, ~21.3 in each)", master: `Lifts_Template_SF_${n}.ai`,
    faces: [{ id: `divsign-transperfect-sflift-${n}`, label: "Lift doors" }],
    division: "transperfect", sizes: SF_LIFT_SIZES_IN,
    note: "From the San Francisco live file: 41.5 in full width, about 21.3 in per door, 84 in high. Retype the headline, move pieces, then download the left and right door files. Confirm the door sizes on site before print.",
  })),
];
/**
 * Supplied event kits (Legalweek, NeXus, Hackathon): each page of the designers'
 * files split into ground, movable pieces and live text by
 * scripts/supplied-kit-signs-extract.py. Wording stays exactly as supplied.
 */
const FIRST_NOTE = "First version made in Element from the supplied logo and colours — get brand approval before it is used or printed.";
const kitSign = (kit: string, id: string, title: string, size: string, master: string, label: string, note?: string): LegalSign => ({
  id, title, size, master, faces: [{ id: `divsign-${id}`, label }], kit, note,
});
export const SUPPLIED_KIT_SIGNS: LegalSign[] = [
  kitSign("legalweek", "legalweek-pillar-welcome", "Legalweek Welcome pillar", "23.6 × 98.4 in", "TPLW_Pillar_Signs.pdf", "Pillar"),
  kitSign("legalweek", "legalweek-pillar-meeting-room", "Legalweek Meeting Room pillar", "23.6 × 98.4 in", "TPLW_Pillar_Signs.pdf", "Pillar"),
  kitSign("legalweek", "legalweek-pillar-reef-lounge", "Legalweek Reef Lounge pillar", "23.6 × 98.4 in", "TPLW_Pillar_Signs.pdf", "Pillar"),
  kitSign("legalweek", "legalweek-pillar-logo", "Legalweek logo pillar", "23.6 × 98.4 in", "TPLW_Pillar_Signs.pdf", "Pillar"),
  kitSign("legalweek", "legalweek-email-600x200", "Legalweek email header", "600 × 200 px", "TP_LW_Email_Hdr_600x200.pdf", "Header"),
  kitSign("legalweek", "legalweek-story-1", "Legalweek story — Two months away", "1080 × 1920 px", "LW26_Post_And_Header.ai", "Story"),
  kitSign("legalweek", "legalweek-story-2", "Legalweek story — Swipe up", "1080 × 1920 px", "LW26_Post_And_Header.ai", "Story"),
  kitSign("legalweek", "legalweek-post-1", "Legalweek post — Two months away", "1200 × 1200 px", "LW26_Post_And_Header.ai", "Post"),
  kitSign("legalweek", "legalweek-post-2", "Legalweek post — NYC, March 9–12", "1200 × 1200 px", "LW26_Post_And_Header.ai", "Post"),
  kitSign("legalweek", "legalweek-banner-600x150", "Legalweek email banner 600 × 150", "600 × 150 px", "LW26_01_Email.ai", "Banner"),
  kitSign("nexus", "nexus-elevator-door-ground-1", "Elevator door (ground) · page 1", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-ground-2", "Elevator door (ground) · page 2", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-ground-3", "Elevator door (ground) · page 3", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-ground-4", "Elevator door (ground) · page 4", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-ground-5", "Elevator door (ground) · page 5", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-ground-6", "Elevator door (ground) · page 6", "43.9 × 82.7 in", "elevator-door-ground.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-extra-1", "Elevator door (extra) · page 1", "43.9 × 82.7 in", "elevator-door-extra.pdf", "Artwork"),
  kitSign("nexus", "nexus-elevator-door-extra-2", "Elevator door (extra) · page 2", "43.9 × 82.7 in", "elevator-door-extra.pdf", "Artwork"),
  kitSign("nexus", "nexus-lift-internal-mirror", "Lift internal mirror", "72.8 × 47.2 in", "lift-internal-mirror.pdf", "Artwork"),
  kitSign("nexus", "nexus-pillar-b", "Pillar B", "105.7 × 56.3 in", "pillar-b.pdf", "Pillar"),
  kitSign("nexus", "nexus-stair-riser-1", "Stair riser · page 1", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-2", "Stair riser · page 2", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-3", "Stair riser · page 3", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-4", "Stair riser · page 4", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-5", "Stair riser · page 5", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-6", "Stair riser · page 6", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-7", "Stair riser · page 7", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-8", "Stair riser · page 8", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-stair-riser-9", "Stair riser · page 9", "66.3 × 4.5 in", "stair-riser.pdf", "Artwork"),
  kitSign("nexus", "nexus-floor-graphic-a", "Floor graphic A", "23.6 × 23.6 in", "floor-graphic-a.pdf", "Artwork"),
  kitSign("nexus", "nexus-floor-graphic-b", "Floor graphic B", "47.2 × 47.2 in", "floor-graphic-b.pdf", "Artwork"),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-1", "NeXus pillar — Covent Garden", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-2", "NeXus pillar — Baker Street", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-3", "NeXus pillar — Bank", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-4", "NeXus pillar — Euston", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-5", "NeXus pillar — Moorgate", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-6", "NeXus pillar — Welcome", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-7", "NeXus pillar — Richmond 1", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-8", "NeXus pillar — Richmond 2", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-9", "NeXus pillar — Richmond 4", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-10", "NeXus pillar — Registration", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-11", "NeXus pillar — Tyburn Kitchen", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-12", "NeXus pillar — Mezzanine", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar", "Room name is live text in Poppins SemiBold — retype it for any room."),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-13", "NeXus pillar — blank (no room name)", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar"),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-14", "NeXus pillar — blank (no room name)", "15.7 × 78.7 in", "regular-nexus-pillar-signs.pdf", "Pillar"),
  kitSign("nexus", "nexus-regular-nexus-pillar-signs-15", "NeXus pillar — arrow", "15.7 × 18.4 in", "regular-nexus-pillar-signs.pdf", "Pillar"),
  kitSign("nexus", "nexus-stage-nexus-pillar-signs", "Stage NeXus pillar signs", "48.0 × 78.7 in", "stage-nexus-pillar-signs.pdf", "Pillar"),
  kitSign("nexus", "nexus-stage-nexus-pillar-sign-light", "Stage NeXus pillar sign (light)", "48.0 × 78.7 in", "stage-nexus-pillar-sign-light.pdf", "Pillar"),
  kitSign("nexus", "nexus-staff-lanyard", "Staff lanyard", "15.3 × 0.8 in", "staff-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-judge-lanyard", "Judge lanyard", "15.2 × 0.8 in", "judge-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-hacker-lanyard", "Hacker lanyard", "15.3 × 0.8 in", "hacker-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-expert-lanyard", "Expert lanyard", "15.3 × 0.8 in", "expert-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-executive-lanyard", "Executive lanyard", "15.2 × 0.8 in", "executive-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-change-maker-lanyard", "Change Maker lanyard", "15.2 × 0.8 in", "change-maker-lanyard.pdf", "Lanyard"),
  kitSign("nexus", "nexus-candlestick-maker-lanyard", "Candlestick Maker lanyard", "16.6 × 0.8 in", "candlestick-maker-lanyard.pdf", "Lanyard"),
  kitSign("hackathon", "hackathon-stage-hackathon-pillar-signs", "Stage Hackathon pillar signs", "48.0 × 78.7 in", "stage-hackathon-pillar-signs.pdf", "Pillar"),
  kitSign("legalweek", "legalweek-banner-1400x280", "Legalweek email banner 1400 × 280", "1400 × 280 px", "LW26_01_Email.ai", "Banner"),
  // First versions for kits that supplied no posts/headers (scripts/event-first-versions-build.py):
  // drawn from each event's own logo and colours, wording limited to issued facts. Brand approval before use.
  ...([
    ["nexus", "nexus", "NeXus"], ["hackathon", "hackathon", "Hackathon"], ["san-juan-bowl", "sjb", "San Juan Bowl"],
  ] as const).flatMap(([kit, k, name]) => [
    kitSign(kit, `${k}-first-post`, `${name} social post — first version`, "1080 × 1080 px", "First version", "Post", FIRST_NOTE),
    kitSign(kit, `${k}-first-story`, `${name} story — first version`, "1080 × 1920 px", "First version", "Story", FIRST_NOTE),
    kitSign(kit, `${k}-first-email`, `${name} email header — first version`, "600 × 200 px", "First version", "Header", FIRST_NOTE),
  ]),
  kitSign("san-juan-bowl", "sjb-first-pillar", "San Juan Bowl pillar — first version", "24 × 96 in (confirm with venue)", "First version", "Pillar", FIRST_NOTE),
];
/** Editable signs of one supplied kit. */
export const kitSigns = (kit: string) => SUPPLIED_KIT_SIGNS.filter((s) => s.kit === kit);

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

export const legalSign = (id: string) => [...LEGAL_NEXT_SIGNS, ...SF_SCREEN_SURROUNDS, ...DIVISION_LIVE_SIGNS, ...SUPPLIED_KIT_SIGNS].find((s) => s.id === id) ?? venueFirstSign(id);
export const legalSignMasterUrl = (s: LegalSign) => masterUrl(s.master);
/** A face's layout; `faceId` may carry a size (`<face>~<w>x<h>`) for a re-sized version. */
export const legalSignLayout = (faceId: string): LiveLayout | null => (isSignId(faceId) ? liveLayoutById(faceId) ?? null : null);
