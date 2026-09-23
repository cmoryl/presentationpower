// What a new event needs from the venue and the organisers before its maps and
// signage can be built — the checklist London taught us, shared by the intake
// panel, the online research and the "start this event" step.

export type IntakeStatus = "missing" | "received" | "scan" | "found_online" | "not_needed";
export type ResearchStatus = "suggested" | "confirmed" | "rejected";

export type IntakeItem = {
  key: string;
  label: string;
  /** Plain-language note on what good looks like. */
  ask: string;
  /** Maps cannot leave draft until every required item is received. */
  required: boolean;
  /** Online research may suggest this item (never confirm it). */
  researchable: boolean;
};

export const EVENT_INTAKE_ITEMS: readonly IntakeItem[] = [
  {
    key: "floor_plans",
    label: "Floor plans for every level",
    ask: "Vector files (PDF, AI or SVG) from the venue, one per level. Picture scans work only as a tracing guide and come out lower quality.",
    required: true,
    researchable: true,
  },
  {
    key: "room_list",
    label: "Room list",
    ask: "Every room's name as the venue signs it, which floor it's on, and its capacity.",
    required: true,
    researchable: true,
  },
  {
    key: "programme",
    label: "Issued programme",
    ask: "Every session with its day, time and room, from the organisers.",
    required: true,
    researchable: false,
  },
  {
    key: "venue_facts",
    label: "Venue name, address and dates",
    ask: "The venue's official name, full address and the event dates.",
    required: true,
    researchable: true,
  },
  {
    key: "venue_logo",
    label: "Venue logo",
    ask: "The venue's approved logo, ideally vector, for the map's venue bar.",
    required: false,
    researchable: true,
  },
  {
    key: "map_url",
    label: "Map web address for QR codes",
    ask: "The web address the map QR codes should open.",
    required: false,
    researchable: false,
  },
  {
    key: "partner_lockups",
    label: "Partner and sponsor logos",
    ask: "Approved logos for every partner that appears on the maps or signs.",
    required: false,
    researchable: false,
  },
  {
    key: "signage_specs",
    label: "Print vendor signage specs",
    ask: "Sign sizes, materials, bleed and file rules from the print vendor.",
    required: false,
    researchable: false,
  },
];

export const INTAKE_STATUS_LABEL: Record<IntakeStatus, string> = {
  missing: "Missing",
  received: "Received",
  scan: "Received (picture scan — lower quality)",
  found_online: "Found online — confirm with venue",
  not_needed: "Not needed",
};

export type IntakeRow = { item_key: string; status: IntakeStatus; note?: string | null };

export type IntakeSummary = {
  received: number;
  total: number;
  /** Required items that are not received yet, by label. */
  blocking: string[];
  /** The map set can leave draft. */
  mapsReady: boolean;
};

/** Received counts only as received — found online and scans still block. */
export function summarizeIntake(rows: readonly IntakeRow[]): IntakeSummary {
  const byKey = new Map(rows.map((r) => [r.item_key, r.status]));
  const status = (key: string): IntakeStatus => byKey.get(key) ?? "missing";
  const done = (s: IntakeStatus) => s === "received" || s === "not_needed";
  const blocking = EVENT_INTAKE_ITEMS.filter((i) => i.required && !done(status(i.key))).map(
    (i) => i.label,
  );
  return {
    received: EVENT_INTAKE_ITEMS.filter((i) => done(status(i.key))).length,
    total: EVENT_INTAKE_ITEMS.length,
    blocking,
    mapsReady: blocking.length === 0,
  };
}

/** Event ids are short slugs: `next-san-francisco-2026`. */
export function eventSlug(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Search queries used to research a venue — bounded so a run stays cheap. */
export function venueResearchQueries(venue: string, city: string): string[] {
  const v = `"${venue.trim()}" ${city.trim()}`.trim();
  return [`${v} floor plan meeting rooms capacity`, `${v} venue address rooms`];
}

export const RESEARCH_MAX_PAGES = 4;
