// -----------------------------------------------------------------------------
// TransPerfect NEXT — City Series attendee badge.
//
// The supplied source pack ("CityNEXT badge.ai" / "CityNEXT badge copy.pdf")
// carries three pages: the plastic-badge print template, and two approved
// artwork faces at the exact bleed size of 4.58" × 6.55".
//
//   page 1  template / specification
//   page 2  DARK face  — navy chevron ascent
//   page 3  LIGHT face — aqua-to-blue diagonal
//
// Both faces are approved. Admins pick which face a print run uses; everything
// else on the badge (city, dates, venue, role band, attendee copy) is typeset
// over the artwork inside the template safe area.
// -----------------------------------------------------------------------------

import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";
import { nextLockupSuite } from "@/lib/next-event-logos";
import faceDark from "@/assets/next-city-badge/citynext-badge-face-dark.png.asset.json";
import faceLight from "@/assets/next-city-badge/citynext-badge-face-light.png.asset.json";
import sourceAi from "@/assets/next-city-badge/citynext-badge.ai.asset.json";
import sourcePdf from "@/assets/next-city-badge/citynext-badge.pdf.asset.json";
import templateJpg from "@/assets/next-city-badge/citynext-badge-template.jpg.asset.json";

/** Approved plastic-badge production geometry (inches). */
export const BADGE_SPEC = {
  bleedW: 4.58,
  bleedH: 6.55,
  trimW: 4.33,
  trimH: 6.3,
  safeW: 4.08,
  safeH: 5.69,
  bleed: 0.125,
  /** Dual hanging slots along the top edge. */
  slot: { w: 0.55, h: 0.14, radius: 0.07, fromTop: 0.19, fromSide: 0.55 },
  /** BLE "Klik" beacon cutout near the bottom edge. */
  klik: { w: 0.86, h: 0.44, radius: 0.12, fromBottom: 0.2 },
  colorMode: "CMYK",
  minImageDpi: 300,
  exportPreset: "PDF/X-1a",
  sourceTemplate: "2025_Plastic-Badge-4.33x6.3-dual-slot + BLE Klik cutout",
} as const;

/** Inset of the safe area from the bleed edge (per axis, in inches). */
export const SAFE_INSET_X = (BADGE_SPEC.bleedW - BADGE_SPEC.safeW) / 2;
export const SAFE_INSET_Y = (BADGE_SPEC.bleedH - BADGE_SPEC.safeH) / 2;

export type CityBadgeFaceId = "dark" | "light";

export type CityBadgeFace = {
  id: CityBadgeFaceId;
  label: string;
  description: string;
  /** Full-bleed artwork, 300 ppi, exactly 4.58" × 6.55". */
  artwork: string;
  /** Ink the typeset copy uses on this face. */
  ink: string;
  /** Panel behind the attendee block so copy always clears the artwork. */
  panel: string;
  panelInk: string;
  /** Role band fill / ink. */
  band: string;
  bandInk: string;
};

export const CITY_BADGE_FACES: CityBadgeFace[] = [
  {
    id: "dark",
    label: "Dark — chevron ascent",
    description:
      "Navy field with the ascending chevron stack and the NEXT City Series lockup at the head. Default for main-stage and evening programmes.",
    artwork: faceDark.url,
    ink: "#FFFFFF",
    panel: "rgba(3,0,44,0.72)",
    panelInk: "#FFFFFF",
    band: "#A1FBF9",
    bandInk: "#03002C",
  },
  {
    id: "light",
    label: "Light — diagonal aqua",
    description:
      "Aqua-to-blue diagonal field with the centred City Series lockup. Default for daytime sessions, expo and registration.",
    artwork: faceLight.url,
    ink: "#FFFFFF",
    panel: "rgba(255,255,255,0.92)",
    panelInk: "#03002C",
    band: "#003FC7",
    bandInk: "#FFFFFF",
  },
];

export function cityBadgeFace(id: string | undefined): CityBadgeFace {
  return CITY_BADGE_FACES.find((f) => f.id === id) ?? CITY_BADGE_FACES[0]!;
}

// ---------------------------------------------------------------------------
// NEXT division tracks. The badge artwork, geometry and typesetting stay
// identical across the programme — only the NEXT lockup changes, so every
// division area (GlobalLink NEXT, Legal NEXT, Games NEXT …) gets its own live
// file off the same approved template.
// ---------------------------------------------------------------------------

export type CityBadgeDivision = {
  id: string;
  name: string;
  /** Stacked lockup URLs + aspect ratio, per colourway. */
  colorUrl: string;
  whiteUrl: string;
  ratio: number;
};

export const CITY_BADGE_DIVISIONS: CityBadgeDivision[] = NEXT_DIVISIONS.map((div) => {
  const suite = nextLockupSuite(div.id);
  return {
    id: div.id,
    name: div.name,
    colorUrl: suite?.stacked.url ?? "",
    whiteUrl: suite?.stackedWhite.url ?? suite?.stacked.url ?? "",
    ratio: suite?.stacked.ratio ?? 1.7,
  };
}).filter((d) => d.colorUrl || d.whiteUrl);

export function cityBadgeDivision(id: string | undefined): CityBadgeDivision {
  return (
    CITY_BADGE_DIVISIONS.find((d) => d.id === id) ??
    CITY_BADGE_DIVISIONS.find((d) => d.id === "city-series") ??
    CITY_BADGE_DIVISIONS[0]!
  );
}

/** Lockup artwork for a division on a given face — white on the dark and
 *  aqua-blue fields, full colour only where the ground is near-white. */
export function cityBadgeLockup(divisionId: string | undefined): { url: string; ratio: number } {
  const div = cityBadgeDivision(divisionId);
  return { url: div.whiteUrl || div.colorUrl, ratio: div.ratio };
}

/** The originals, kept downloadable so production can work from source. */
export const CITY_BADGE_SOURCE = {
  ai: sourceAi.url,
  pdf: sourcePdf.url,
  template: templateJpg.url,
} as const;

/** Attendee tiers printed on the role band of the general NEXT badge. */
export const CITY_BADGE_ROLES = [
  "ATTENDEE",
  "EMPLOYEE",
  "CLIENT",
  "SPECIAL GUEST",
  "VIP",
] as const;

/**
 * Where the supplied artwork carries its baked NEXT lockup. Swapping a division
 * mark replaces exactly this window — the field around it is resampled from the
 * same artwork, so nothing is added to the badge and no plate appears.
 */
export const BADGE_LOCKUP_WINDOW = {
  /** Window covered on the plate (inches from the top of the bleed sheet). */
  top: 0.28,
  height: 1.95,
  /** Mark-free band of the same artwork used to repaint that window. */
  sampleFrom: 3.5,
  /** Replacement lockup width on the plate. */
  markW: 2.62,
} as const;


/**
 * A saved, print-ready configuration of the City Series badge. Persisted in the
 * backend so a run can be re-exported byte-for-byte later.
 */
export type CityBadgeConfig = {
  face: CityBadgeFaceId;
  /** NEXT division track whose lockup prints on the badge. */
  divisionId: string;
  /** Print the division lockup at the head of the badge. */
  showLockup: boolean;
  cityLabel: string;
  datesLabel: string;
  venueLabel: string;
  roleLabel: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  reference: string;
  /** Show the attendee block at all — some runs print blank stock. */
  showAttendee: boolean;
};

export const CITY_BADGE_DEFAULT: CityBadgeConfig = {
  face: "dark",
  divisionId: "city-series",
  showLockup: true,
  cityLabel: "City Series",
  datesLabel: "2026 season",
  venueLabel: "",
  roleLabel: "ATTENDEE",
  firstName: "Alexandra",
  lastName: "Okonkwo",
  jobTitle: "VP, Global Content Operations",
  company: "Meridian Studios",
  reference: "NX26-CS-0481",
  showAttendee: true,
};

export function normalizeCityBadgeConfig(input: unknown): CityBadgeConfig {
  const raw = (input ?? {}) as Partial<CityBadgeConfig>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  return {
    face: raw.face === "light" ? "light" : "dark",
    divisionId: cityBadgeDivision(typeof raw.divisionId === "string" ? raw.divisionId : undefined).id,
    showLockup: raw.showLockup !== false,
    cityLabel: str(raw.cityLabel, CITY_BADGE_DEFAULT.cityLabel),
    datesLabel: str(raw.datesLabel, CITY_BADGE_DEFAULT.datesLabel),
    venueLabel: str(raw.venueLabel, ""),
    roleLabel: str(raw.roleLabel, CITY_BADGE_DEFAULT.roleLabel),
    firstName: str(raw.firstName, ""),
    lastName: str(raw.lastName, ""),
    jobTitle: str(raw.jobTitle, ""),
    company: str(raw.company, ""),
    reference: str(raw.reference, ""),
    showAttendee: raw.showAttendee !== false,
  };
}

/** Saved version row as the UI consumes it. */
export type CityBadgeVersion = {
  id: string;
  name: string;
  face: CityBadgeFaceId;
  cityLabel: string;
  datesLabel: string;
  venueLabel: string;
  roleLabel: string;
  notes: string;
  status: "draft" | "approved" | "archived";
  config: CityBadgeConfig;
  createdAt: string;
  updatedAt: string;
};

export function badgeVersionSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "city-series-badge"
  );
}
