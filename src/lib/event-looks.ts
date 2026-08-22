// ---------------------------------------------------------------------------
// EVENT LOOKS — one art direction per event demo set.
//
// Every event demo used to render on the same NEXT City field: navy plate,
// blue accent, chevron motif, one social template style. That made sixteen very
// different archetypes (product launch, awards night, hackathon, executive
// briefing …) read as one deck of NEXT collateral.
//
// A look is the presentation contract for a demo set:
//   • palette  — deep plate, accent, secondary accent, light field
//   • motif    — the field graphic drawn behind the artwork
//   • type     — headline case + corner radius character
//   • social   — which social template style the rendered assets use
//
// Looks are data, so a demo set is themed by mapping its id here, and the demo
// page exposes the same list as an editable switcher.
// ---------------------------------------------------------------------------

import type { SocialStyleId } from "./social-styles";

export type EventMotif =
  | "chevron"
  | "grid"
  | "arcs"
  | "rays"
  | "dots"
  | "waves"
  | "terrazzo"
  | "bars";

export interface EventLook {
  id: string;
  label: string;
  /** Short chip, e.g. "Launch". */
  tag: string;
  blurb: string;
  /** Deep plate for dark artwork fields. */
  deep: string;
  /** Primary accent — rules, chips, motif colour. */
  accent: string;
  /** Secondary accent for tracks, ribbons and highlights. */
  accentAlt: string;
  /** Ink on light fields. */
  ink: string;
  /** Light field gradient stops. */
  lightFrom: string;
  lightTo: string;
  motif: EventMotif;
  /** Motif strength on dark fields, 0–0.3. */
  motifOpacity: number;
  /** Corner radius character for plates and chips. */
  radius: number;
  /** Headline case. */
  uppercase: boolean;
  /** Social template style used by the rendered asset set. */
  styleId: SocialStyleId;
}

export const EVENT_LOOKS: EventLook[] = [
  {
    id: "next-city",
    label: "NEXT City",
    tag: "Conference",
    blurb:
      "The approved NEXT field: deep navy plate, electric blue chevrons, editorial glass copy band.",
    deep: "#0A1030",
    accent: "#13B1F3",
    accentAlt: "#3BBEB6",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#EEF3FF",
    motif: "chevron",
    motifOpacity: 0.13,
    radius: 14,
    uppercase: false,
    styleId: "editorial-glass",
  },
  {
    id: "launch-signal",
    label: "Launch Signal",
    tag: "Launch",
    blurb:
      "Product-launch energy: primary blue plate, radiating signal rays and a hard block headline.",
    deep: "#001A66",
    accent: "#003FC7",
    accentAlt: "#A1FBF9",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#E0E8F5",
    motif: "rays",
    motifOpacity: 0.16,
    radius: 6,
    uppercase: false,
    styleId: "bold-block",
  },
  {
    id: "clinical-calm",
    label: "Clinical Calm",
    tag: "Life sciences",
    blurb:
      "Precision grid on a cool teal-navy plate. Quiet type, generous air — built for regulated content.",
    deep: "#0B2A3A",
    accent: "#4A90E2",
    accentAlt: "#A6FA87",
    ink: "#0E2A47",
    lightFrom: "#FFFFFF",
    lightTo: "#EEF6F9",
    motif: "grid",
    motifOpacity: 0.1,
    radius: 4,
    uppercase: false,
    styleId: "minimal-rule",
  },
  {
    id: "counsel-authority",
    label: "Counsel Authority",
    tag: "Legal",
    blurb:
      "Near-black plate, hairline bars and small-caps headlines. Reads as counsel-grade, not campaign.",
    deep: "#03002C",
    accent: "#C2A3FF",
    accentAlt: "#E0E8F5",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#F2F2F2",
    motif: "bars",
    motifOpacity: 0.12,
    radius: 2,
    uppercase: true,
    styleId: "split-band",
  },
  {
    id: "studio-aura",
    label: "Studio Aura",
    tag: "Digital",
    blurb: "Soft aqua aura and arc geometry over an ink plate — webinar and roundtable register.",
    deep: "#071A2E",
    accent: "#A1FBF9",
    accentAlt: "#13B1F3",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#E8FBFC",
    motif: "arcs",
    motifOpacity: 0.18,
    radius: 24,
    uppercase: false,
    styleId: "aura-soft",
  },
  {
    id: "field-warmth",
    label: "Field Warmth",
    tag: "Roadshow",
    blurb: "Peach and amber waves on a warm plate — regional roadshows and customer field days.",
    deep: "#2A1408",
    accent: "#FF9B70",
    accentAlt: "#FFEB66",
    ink: "#2A1408",
    lightFrom: "#FFFFFF",
    lightTo: "#FFF3EA",
    motif: "waves",
    motifOpacity: 0.2,
    radius: 20,
    uppercase: false,
    styleId: "photo-gradient",
  },
  {
    id: "gala-spotlight",
    label: "Gala Spotlight",
    tag: "Awards",
    blurb: "Pink-on-black spotlight terrazzo with a poster headline stack — awards and gala nights.",
    deep: "#150011",
    accent: "#EC388A",
    accentAlt: "#FFEB66",
    ink: "#03002C",
    lightFrom: "#FFFFFF",
    lightTo: "#FDEBF3",
    motif: "terrazzo",
    motifOpacity: 0.22,
    radius: 10,
    uppercase: true,
    styleId: "poster-stack",
  },
  {
    id: "build-lab",
    label: "Build Lab",
    tag: "Hackathon",
    blurb: "Dot-matrix build field in green and aqua — hackathons, labs and technical field events.",
    deep: "#04140F",
    accent: "#A6FA87",
    accentAlt: "#A1FBF9",
    ink: "#04140F",
    lightFrom: "#FFFFFF",
    lightTo: "#EDFBEE",
    motif: "dots",
    motifOpacity: 0.2,
    radius: 8,
    uppercase: false,
    styleId: "minimal-rule",
  },
];

export const EVENT_LOOKS_BY_ID: Record<string, EventLook> = Object.fromEntries(
  EVENT_LOOKS.map((l) => [l.id, l]),
);

export const DEFAULT_EVENT_LOOK_ID = "next-city";

/** Playbook id → look id. Every demo set gets its own art direction. */
export const PLAYBOOK_LOOK_ID: Record<string, string> = {
  "product-launch": "launch-signal",
  "flagship-conference": "next-city",
  "life-sciences-summit": "clinical-calm",
  "legaltech-day": "counsel-authority",
  "webinar-roundtable": "studio-aura",
  "executive-briefing": "counsel-authority",
  "field-roadshow": "field-warmth",
  "industry-awards": "gala-spotlight",
  "trade-show-booth": "launch-signal",
  hackathon: "build-lab",
  "customer-summit": "field-warmth",
  "field-day": "build-lab",
  "legal-roundtable": "counsel-authority",
  "gaming-launch-party": "gala-spotlight",
  "next-flagship-london": "next-city",
  "next-city-series": "next-city",
};

export function eventLookById(id: string | null | undefined): EventLook {
  return EVENT_LOOKS_BY_ID[id ?? ""] ?? EVENT_LOOKS_BY_ID[DEFAULT_EVENT_LOOK_ID]!;
}

/** The authored look for a playbook, or the NEXT field when unmapped. */
export function eventLookForPlaybook(playbookId: string | null | undefined): EventLook {
  return eventLookById(PLAYBOOK_LOOK_ID[playbookId ?? ""] ?? DEFAULT_EVENT_LOOK_ID);
}
