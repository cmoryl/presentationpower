// Legal NEXT general signage templates — supplied Illustrator files, edited in
// the shared kiosk layer editor. City, date and venue facts are NOT part of
// these templates; the supplied copy is used exactly as received.

import financeDeskPreview from "@/assets/finance-pillars/reg-desk.jpg.asset.json";
import { SIGN_LIVE_LAYOUTS, isSignId, type LiveLayout } from "@/lib/next-california-kiosk-live";

type Ptr = { url: string };
const MASTERS = import.meta.glob<Ptr>(["../assets/legal-next-signage/masters/*.asset.json", "../assets/sf-screen-surrounds/masters/*.asset.json"], { eager: true, import: "default" });
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
};

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
 * San Francisco breakout-room screen surrounds, built from the supplied live
 * .ai files (1 Oct 2026): gradient ground + left and right chevron groups. The
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
  },
];

export const legalSign = (id: string) => [...LEGAL_NEXT_SIGNS, ...SF_SCREEN_SURROUNDS, ...DIVISION_LIVE_SIGNS].find((s) => s.id === id) ?? null;
export const legalSignMasterUrl = (s: LegalSign) => masterUrl(s.master);
export const legalSignLayout = (faceId: string): LiveLayout | null => (isSignId(faceId) ? SIGN_LIVE_LAYOUTS[faceId] ?? null : null);
