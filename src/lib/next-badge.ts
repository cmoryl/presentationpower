// TransPerfect NEXT 2026 — attendee badge specification.
//
// Transcribed from the supplied print template:
//   "2025_Plastic-Badge-4.33x6.3-dual-slot + BLE Klik cutout"
//
//   Bleed zone (0.125")  4.58" × 6.55"
//   Badge edge (trim)    4.33" × 6.30"
//   Safe area            4.08" × 5.69"
//   Dual slots           two rounded slots along the top edge
//   BLE Klik cutout      rounded rectangle near the bottom edge
//
// Everything downstream (component, print CSS, division variants) reads these
// numbers rather than repeating literals.

import { NEXT_DIVISIONS, type NextDivisionBrand, NEXT_NAVY_ARTWORK } from "@/lib/next-brand-guide";

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

export type BadgeRole = {
  id: string;
  label: string;
  /** true = role band uses the division accent, false = white on navy. */
  accentBand: boolean;
};

/** Attendee categories printed in the role band. */
export const BADGE_ROLES: BadgeRole[] = [
  { id: "attendee", label: "ATTENDEE", accentBand: true },
  { id: "speaker", label: "SPEAKER", accentBand: true },
  { id: "sponsor", label: "SPONSOR", accentBand: true },
  { id: "press", label: "PRESS", accentBand: false },
  { id: "staff", label: "TRANSPERFECT TEAM", accentBand: false },
  { id: "vip", label: "VIP / EXECUTIVE", accentBand: true },
];

export type BadgeAttendee = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  pronouns?: string;
  roleId: string;
  /** Free text under the QR block, e.g. a registration id. */
  reference?: string;
};

export const SAMPLE_ATTENDEE: BadgeAttendee = {
  firstName: "Alexandra",
  lastName: "Okonkwo",
  jobTitle: "VP, Global Content Operations",
  company: "Meridian Studios",
  pronouns: "she/her",
  roleId: "attendee",
  reference: "NX26-04812",
};

export const BADGE_EVENT = {
  datesLabel: "24 & 25 September 2026",
  venue: "QEII Centre",
  city: "Westminster, London",
  hashtag: "#TransPerfectNEXT",
  url: "transperfect.com/next",
} as const;

/** Back-of-badge utility content — identical across divisions. */
export const BADGE_BACK_INFO: { label: string; lines: string[] }[] = [
  { label: "Day 1 · 24 Sep", lines: ["08:30 Registration", "09:30 Keynote", "18:00 Evening reception"] },
  { label: "Day 2 · 25 Sep", lines: ["09:00 Breakouts", "13:00 Networking lunch", "16:30 Closing"] },
  { label: "Wi-Fi", lines: ["Network: NEXT2026", "Password: globalnext"] },
  { label: "Help", lines: ["Info desk · Level 1", "next@transperfect.com"] },
];

/** Divisions that get a badge variant, master + City Series first. */
export function badgeDivisions(): NextDivisionBrand[] {
  const order = ["transperfect", "city-series"];
  return [...NEXT_DIVISIONS].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/**
 * Resolves a badge division from either a brand-guide id or the hub registry
 * id (which spells Life Sciences without the hyphen and has no City Series).
 */
export function badgeDivisionFor(id: string): NextDivisionBrand | undefined {
  const alias: Record<string, string> = { lifesci: "life-sci", "life-sciences": "life-sci" };
  const target = alias[id] ?? id;
  return NEXT_DIVISIONS.find((d) => d.id === target);
}


/** Stacked lockup src for a division, preferring the all-white variant. */
export function badgeLockup(div: NextDivisionBrand, variant: "white" | "color" = "white") {
  const stacked =
    div.lockups.find((l) => l.lockup === "stacked" && l.variant === variant) ??
    div.lockups.find((l) => l.variant === variant) ??
    div.lockups[0];
  return { src: stacked?.src ?? "", aspect: stacked?.aspect ?? 1.85 };
}

export const BADGE_NAVY = NEXT_NAVY_ARTWORK;
