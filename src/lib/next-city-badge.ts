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

import { BADGE_SPEC, SAFE_INSET_X, SAFE_INSET_Y } from "@/lib/next-badge";
import faceDark from "@/assets/next-city-badge/citynext-badge-face-dark.png.asset.json";
import faceLight from "@/assets/next-city-badge/citynext-badge-face-light.png.asset.json";
import sourceAi from "@/assets/next-city-badge/citynext-badge.ai.asset.json";
import sourcePdf from "@/assets/next-city-badge/citynext-badge.pdf.asset.json";
import templateJpg from "@/assets/next-city-badge/citynext-badge-template.jpg.asset.json";

export { BADGE_SPEC, SAFE_INSET_X, SAFE_INSET_Y };

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

/** The originals, kept downloadable so production can work from source. */
export const CITY_BADGE_SOURCE = {
  ai: sourceAi.url,
  pdf: sourcePdf.url,
  template: templateJpg.url,
} as const;

export const CITY_BADGE_ROLES = [
  "ATTENDEE",
  "SPEAKER",
  "SPONSOR",
  "PRESS",
  "TRANSPERFECT TEAM",
  "VIP / EXECUTIVE",
] as const;

/**
 * A saved, print-ready configuration of the City Series badge. Persisted in the
 * backend so a run can be re-exported byte-for-byte later.
 */
export type CityBadgeConfig = {
  face: CityBadgeFaceId;
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
