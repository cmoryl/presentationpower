// -----------------------------------------------------------------------------
// TransPerfect NEXT — attendee badge (single approved template).
//
// One template now serves NEXT and every sub-NEXT event: the approved violet →
// blue ascent ground with the chevron stack, the white-with-accent division
// lockup on the front and the back, and BEYOND INTELLIGENCE on the back foot.
// The earlier dark / light artwork faces and the supplied source pack are
// retired — every division area renders live off this one template, so nothing
// can drift between areas.
//
// Geometry is unchanged: the 4.33" × 6.3" dual-slot plastic template with the
// BLE Klik cutout, art run full bleed at 4.58" × 6.55".
// -----------------------------------------------------------------------------

import { NEXT_DIVISIONS } from "@/lib/next-brand-guide";
import { nextLockupSuite } from "@/lib/next-event-logos";

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

/** One approved template for NEXT and every sub-NEXT event. */
export type CityBadgeFaceId = "next";

export type CityBadgeFace = {
  id: CityBadgeFaceId;
  label: string;
  description: string;
  /** Ink the typeset copy uses. */
  ink: string;
  /** Panel behind the attendee block so copy always clears the ground. */
  panel: string;
  panelInk: string;
  /** Role band fill / ink. */
  band: string;
  bandInk: string;
};

export const CITY_BADGE_FACE: CityBadgeFace = {
  id: "next",
  label: "NEXT template",
  description:
    "Approved NEXT ground — violet-to-blue ascent with the chevron stack, the white-with-accent division lockup on the front and back, BEYOND INTELLIGENCE on the back foot.",
  ink: "#FFFFFF",
  panel: "rgba(3,0,44,0.58)",
  panelInk: "#FFFFFF",
  band: "#A1FBF9",
  bandInk: "#03002C",
};

/** Kept as a one-entry list so existing callers keep working. */
export const CITY_BADGE_FACES: CityBadgeFace[] = [CITY_BADGE_FACE];

export function cityBadgeFace(_id?: string | undefined): CityBadgeFace {
  return CITY_BADGE_FACE;
}

/**
 * The approved ground, as the live renderer draws it: a violet → blue ascent
 * with a cooler aqua-blue foot, and the chevron stack as a faint white texture.
 */
export const NEXT_BADGE_GROUND = {
  topLeft: "#C266E8",
  topRight: "#4457DE",
  core: "#1D3FD1",
  foot: "#8FD2F4",
  glow: "#7A5BF0",
  chevronInk: "rgba(255,255,255,0.10)",
} as const;

/** Standing line on the back foot of every NEXT badge. */
export const BADGE_BACK_LINE = "BEYOND INTELLIGENCE";

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

/** Lockup for a division — always the white mark with its colour accent, which
 *  is the only approved treatment on this ground. */
export function cityBadgeLockup(divisionId: string | undefined): { url: string; ratio: number } {
  const div = cityBadgeDivision(divisionId);
  return { url: div.whiteUrl || div.colorUrl, ratio: div.ratio };
}

/** Attendee tiers printed on the role band of the general NEXT badge. */
export const CITY_BADGE_ROLES = ["ATTENDEE", "EMPLOYEE", "CLIENT", "SPECIAL GUEST", "VIP"] as const;

/** Where the division lockup sits on the template (inches from the bleed top). */
export const BADGE_LOCKUP_WINDOW = {
  /** Front: mark at the head of the badge. */
  top: 0.42,
  height: 1.72,
  /** Front mark width on the plate. */
  markW: 2.62,
  /** Back: mark centred on the ground, a touch larger. */
  backMarkW: 2.86,
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
  face: "next",
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
    // Legacy rows saved a dark / light artwork face; both now resolve to the
    // single approved NEXT template.
    face: "next",
    divisionId: cityBadgeDivision(typeof raw.divisionId === "string" ? raw.divisionId : undefined)
      .id,
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
