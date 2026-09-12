// Starting the playbook for the NEXT city after London.
//
// London 2026 settled the look, and `next-venue-templates.ts` holds the reusable
// part of every sign family. What a new city still needs is the boring first
// hour of a job: which signs it is going to need at all, at roughly what size,
// on which ground, with which print note — a starting schedule rather than a
// blank page.
//
// This module turns a short brief about the next venue (how many floors, rooms,
// entrances, lifts, desks, divisions) into that schedule, using only knowledge
// already earned:
//   * the family carries the face shape, copy slots, ground and print note,
//   * the size carried forward is the MEDIAN London trim for that family, and
//     it is labelled "carried size" — a starting point to be replaced by a site
//     survey, never a measurement of the new venue,
//   * families London never produced are reported as gaps, not invented.
//
// Nothing here claims to know the next venue. It says what London knows, sized
// as London sized it, so a new city starts from the settled look.

import {
  NEXT_VENUE_TEMPLATES,
  venueTemplateAudit,
  type VenueTemplateFamily,
  type VenueTemplatePanelLike,
} from "@/lib/next-venue-templates";

export type CityBrief = {
  /** City the next NEXT lands in, e.g. "Singapore". */
  city: string;
  /** Venue name as it will be printed. */
  venue: string;
  /** Dates line as it will be printed, e.g. "12–13 May 2027". */
  dates: string;
  /** Floors or levels the event occupies. */
  floors: number;
  /** Breakout / session rooms that need door and wayfinding branding. */
  breakoutRooms: number;
  /** Street-facing entrances. */
  entrances: number;
  /** Lifts inside the event footprint. */
  lifts: number;
  /** Staffed desks: registration, information, support. */
  desks: number;
  /** Divisions taking their own branded space. */
  divisions: number;
  /** Partner stands in the exhibition space. */
  partnerStands: number;
};

export const DEFAULT_CITY_BRIEF: CityBrief = {
  city: "",
  venue: "",
  dates: "",
  floors: 3,
  breakoutRooms: 6,
  entrances: 1,
  lifts: 2,
  desks: 3,
  divisions: 11,
  partnerStands: 8,
};

/** Where a starting size came from. Only ever London, or nothing. */
export type CarriedSizeSource = "carried" | "none";

export type CityStarterItem = {
  /** Running reference for the new city's schedule, e.g. "SIN-01". */
  ref: string;
  family: VenueTemplateFamily;
  /** What this line is for in the new venue, in the venue's own words. */
  area: string;
  /** How many of this line the brief implies. */
  qty: number;
  /** Starting trim in mm, carried from London. Null when London never made one. */
  trimW: number | null;
  trimH: number | null;
  /** Bleed London produced the family at, in mm. */
  bleedEdge: number | null;
  sizeSource: CarriedSizeSource;
  /** Plain-language note on where the size came from and what to do with it. */
  sizeNote: string;
};

export type CityStarter = {
  brief: CityBrief;
  prefix: string;
  items: CityStarterItem[];
  /** Total pieces to print across the schedule. */
  pieces: number;
  /** Families with a carried size, and families still needing a first build. */
  carried: number;
  gaps: VenueTemplateFamily[];
};

/** Three-letter schedule prefix from the city name, e.g. "Singapore" → "SIN". */
export function cityPrefix(city: string): string {
  const letters = city.replace(/[^a-z]/gi, "").toUpperCase();
  return letters.length >= 3 ? letters.slice(0, 3) : (letters + "NXT").slice(0, 3);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** What each family is for at a venue, and how many the brief implies. */
const PLACEMENT: Record<
  string,
  { area: string; qty: (b: CityBrief) => number }
> = {
  "vt-exterior-flag": { area: "Street approach", qty: (b) => Math.max(2, b.entrances * 4) },
  "vt-canopy-banner": { area: "Entrance canopy", qty: (b) => b.entrances },
  "vt-floor-vinyl": { area: "Entrance floor", qty: (b) => b.entrances },
  "vt-lift-door": { area: "Lift lobbies", qty: (b) => b.lifts * b.floors },
  "vt-lift-walls": { area: "Lift cars", qty: (b) => b.lifts },
  "vt-desk-front": { area: "Staffed desks", qty: (b) => b.desks },
  "vt-desk-return": { area: "Staffed desks", qty: (b) => b.desks },
  "vt-glass-vinyl": { area: "Glazed room fronts", qty: (b) => b.breakoutRooms },
  "vt-door-vinyl": { area: "Session room doors", qty: (b) => b.breakoutRooms },
  "vt-pillar": { area: "Foyer columns", qty: (b) => Math.max(2, b.floors) },
  "vt-scenic-panel": { area: "Plenary and foyer scenic runs", qty: (b) => b.floors * 4 },
  "vt-step-repeat": { area: "Press and photo wall", qty: () => 1 },
  "vt-agenda-board": { area: "Room and floor agendas", qty: (b) => b.floors + b.divisions },
  "vt-tabletop": { area: "Catering and lounge tables", qty: (b) => b.floors * 4 },
  "vt-wayfinding": { area: "Circulation and stairs", qty: (b) => b.floors * 3 },
  "vt-brew-bar": { area: "NEXT Brew coffee bar", qty: (b) => Math.max(1, Math.floor(b.floors / 2)) },
  "vt-booth-wall": { area: "Partner stands", qty: (b) => b.partnerStands },
  "vt-division-panel": { area: "Division spaces", qty: (b) => b.divisions },
};

/**
 * A starting sign schedule for the next city, built from the London families.
 *
 * `panels` is the settled London set — it supplies the carried sizes, so the
 * schedule stays honest about what has actually been produced.
 */
export function cityStarter<P extends VenueTemplatePanelLike>(
  brief: CityBrief,
  panels: P[],
): CityStarter {
  const audit = venueTemplateAudit(panels);
  const sizes = new Map<string, { trimW: number; trimH: number; bleedEdge: number }>();
  for (const cover of audit.coverage) {
    if (!cover.panels.length) continue;
    sizes.set(cover.family.id, {
      trimW: median(cover.panels.map((p) => p.trimW)),
      trimH: median(cover.panels.map((p) => p.trimH)),
      bleedEdge: median(cover.panels.map((p) => p.bleedEdge)),
    });
  }

  const prefix = cityPrefix(brief.city || "NEXT");
  const items: CityStarterItem[] = [];
  const gaps: VenueTemplateFamily[] = [];

  NEXT_VENUE_TEMPLATES.forEach((family) => {
    const placement = PLACEMENT[family.id];
    const qty = Math.max(1, Math.round(placement ? placement.qty(brief) : 1));
    const size = sizes.get(family.id) ?? null;
    if (!size) gaps.push(family);
    items.push({
      ref: `${prefix}-${String(items.length + 1).padStart(2, "0")}`,
      family,
      area: placement?.area ?? "To be placed on the venue walk-through",
      qty,
      trimW: size?.trimW ?? null,
      trimH: size?.trimH ?? null,
      bleedEdge: size?.bleedEdge ?? null,
      sizeSource: size ? "carried" : "none",
      sizeNote: size
        ? "Carried from the London build — replace with the surveyed surface before printing."
        : "No London build to carry a size from. Size this one from the venue survey.",
    });
  });

  return {
    brief,
    prefix,
    items,
    pieces: items.reduce((sum, item) => sum + item.qty, 0),
    carried: items.filter((item) => item.sizeSource === "carried").length,
    gaps,
  };
}

const CSV_HEADERS = [
  "Ref",
  "Family",
  "Area",
  "Qty",
  "Substrate",
  "Ground",
  "Copy slots",
  "Carried trim W (mm)",
  "Carried trim H (mm)",
  "Bleed (mm)",
  "Size source",
  "Print note",
];

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The starting schedule as a CSV a printer or producer can work from. */
export function cityStarterCsv(starter: CityStarter): string {
  const head = `# TransPerfect NEXT — ${starter.brief.city || "next city"} starting sign schedule`;
  const context = `# ${starter.brief.venue || "venue TBC"} · ${starter.brief.dates || "dates TBC"} · sizes carried from London 2026, to be replaced by survey`;
  const rows = starter.items.map((item) =>
    [
      item.ref,
      item.family.name,
      item.area,
      item.qty,
      item.family.substrate,
      item.family.ground,
      item.family.slots.join(" / "),
      item.trimW,
      item.trimH,
      item.bleedEdge,
      item.sizeSource === "carried" ? "Carried from London" : "Needs survey",
      item.family.printNote,
    ]
      .map(csvCell)
      .join(","),
  );
  return [head, context, CSV_HEADERS.join(","), ...rows].join("\n");
}
