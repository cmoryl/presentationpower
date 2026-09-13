// NEXT ecosystem VENUE TEMPLATE FAMILIES.
//
// London 2026 (QEII Centre) is where the NEXT signage look was settled, so the
// finished London files are the reference set for every venue that follows.
// This registry keeps the *reusable* part of each sign — the shape of the face,
// which copy slots it carries, how the ground is built and what the print notes
// are — separate from London's own trims and room names.
//
// A new venue reuses a family, supplies its own trim and copy, and gets the same
// look without re-deriving it: `venueTemplateFor(panelId)` says which family a
// London sign belongs to, and `NEXT_VENUE_TEMPLATES` is the catalogue.

export type VenueTemplateSlot =
  /** Event lockup — NEXT logo, sub-event lockup or division lockup. */
  | "lockup"
  /** Large room or statement line, e.g. WESTMINSTER, BEYOND INTELLIGENCE. */
  | "headline"
  /** Supporting line under the headline. */
  | "subhead"
  /** Wayfinding or instruction line, e.g. CHECK-IN | INFORMATION. */
  | "utility"
  /** Scannable code — agenda, room or event link. */
  | "qr"
  /** Repeating lockup pattern across the face. */
  | "pattern";

export type VenueTemplateFamily = {
  id: string;
  /** Plain-language name used in the kit. */
  name: string;
  /** What the sign physically is, so another venue can match it. */
  substrate: string;
  /** Editable copy slots this family carries, in reading order. */
  slots: VenueTemplateSlot[];
  /** Ground treatment the family uses, by house gradient family id. */
  ground: "house-gradient" | "division-gradient" | "repeat-white" | "supplied";
  /** Whether the face is portrait, landscape, square or a run of any ratio. */
  orientation: "portrait" | "landscape" | "square" | "any";
  /** London signs this family was settled on. */
  londonPanels: string[];
  /** Print notes that travel with the family to any venue. */
  printNote: string;
};

export const NEXT_VENUE_TEMPLATES: VenueTemplateFamily[] = [
  {
    id: "vt-exterior-flag",
    name: "Exterior flag",
    substrate: "Double-sided flag on a venue pole",
    slots: ["lockup", "headline"],
    ground: "house-gradient",
    orientation: "portrait",
    londonPanels: ["ldn-v01", "ldn-v52"],
    printNote:
      "Alternate TransPerfect and TransPerfect NEXT along the run. Hem and pole pocket sit outside trim.",
  },
  {
    id: "vt-canopy-banner",
    name: "Canopy banner",
    substrate: "Long tensioned banner over the entrance",
    slots: ["headline", "lockup"],
    ground: "house-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v02"],
    printNote:
      "Supplied at fractional scale where true size exceeds the Illustrator artboard limit — the scale is stated in the file name and must be honoured at output.",
  },
  {
    id: "vt-floor-vinyl",
    name: "Floor vinyl",
    substrate: "Anti-slip laminated floor graphic",
    slots: ["headline", "lockup"],
    ground: "house-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v03"],
    printNote: "Anti-slip laminate required. Keep copy clear of the 100 mm walk-on edge.",
  },
  {
    id: "vt-lift-door",
    name: "Lift door",
    substrate: "Lift door vinyl, split across leaves",
    slots: ["lockup", "headline"],
    ground: "house-gradient",
    orientation: "portrait",
    londonPanels: ["ldn-v04"],
    printNote: "Copy must not cross the leaf gap. One quote or line per lift.",
  },
  {
    id: "vt-lift-walls",
    name: "Lift interior walls",
    substrate: "Lift car wall vinyl",
    slots: ["pattern", "lockup"],
    ground: "house-gradient",
    orientation: "portrait",
    londonPanels: ["ldn-v05"],
    printNote: "Adapted from the badge reverse. Allow for handrail and control panel cut-outs.",
  },
  {
    id: "vt-desk-front",
    name: "Desk front",
    substrate: "Desk fascia vinyl",
    slots: ["utility", "lockup"],
    ground: "house-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v62", "ldn-v63", "ldn-v64", "ldn-v65", "ldn-v68"],
    printNote: "Keep the utility line above desk-height sight lines; wrap allowance on both ends.",
  },
  {
    id: "vt-desk-return",
    name: "Desk return",
    substrate: "Desk side-return vinyl",
    slots: ["lockup"],
    ground: "house-gradient",
    orientation: "portrait",
    londonPanels: ["ldn-v69"],
    printNote: "Lockup only — no copy on a return this narrow.",
  },
  {
    id: "vt-glass-vinyl",
    name: "Glass vinyl",
    substrate: "Applied glass graphic, partition or door glazing",
    slots: ["lockup", "headline"],
    ground: "house-gradient",
    orientation: "any",
    londonPanels: [
      "ldn-v53",
      "ldn-v54",
      "ldn-v55",
      "ldn-v56",
      "ldn-v57",
      "ldn-v58",
      "ldn-v59",
      "ldn-v60",
      "ldn-v61",
      "ldn-v34",
      "ldn-v35",
      "ldn-v36",
    ],
    printNote:
      "Wide panels are supplied at 50% scale — output at 200%. Manifestation height must clear building regulations.",
  },
  {
    id: "vt-door-branding",
    name: "Door branding",
    substrate: "Room door vinyl or poly board",
    slots: ["lockup", "headline"],
    ground: "division-gradient",
    orientation: "portrait",
    londonPanels: [
      "ldn-v15",
      "ldn-v16",
      "ldn-v17",
      "ldn-v18",
      "ldn-v21",
      "ldn-v22",
      "ldn-v25",
      "ldn-v26",
      "ldn-v27",
      "ldn-v28",
      "ldn-v29",
      "ldn-v46",
    ],
    printNote:
      "One sub-event per room; white lockups only. Poly board where vinyl is not permitted on the door face.",
  },
  {
    id: "vt-beam-vinyl",
    name: "Beam vinyl",
    substrate: "Structural beam or bulkhead band",
    slots: ["lockup", "headline"],
    ground: "division-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v13", "ldn-v20"],
    printNote: "Long, shallow band — set copy on the optical centre line, not the geometric one.",
  },
  {
    id: "vt-wall-panel",
    name: "Wall panel",
    substrate: "Flat wall graphic or scenic build face",
    slots: ["lockup", "headline", "subhead", "qr"],
    ground: "house-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v14", "ldn-v32", "ldn-v40", "ldn-v41"],
    printNote: "Panelise to the vendor's build widths; keep the lockup out of any join.",
  },
  {
    id: "vt-table-top",
    name: "Table top",
    substrate: "Coffee-bar table top graphic",
    slots: ["lockup", "headline"],
    ground: "house-gradient",
    orientation: "square",
    londonPanels: ["ldn-v09", "ldn-v10", "ldn-v11", "ldn-v12"],
    printNote:
      "NEXTbrew treatment. Round tops need the artwork centred on the diameter with bleed all round.",
  },
  {
    id: "vt-pillar-wrap",
    name: "Pillar wrap",
    substrate: "Four-sided column wrap",
    slots: ["lockup", "headline", "qr"],
    ground: "division-gradient",
    orientation: "portrait",
    londonPanels: ["ldn-v30", "ldn-v31", "ldn-v33", "ldn-v49"],
    printNote:
      "Per-side artwork with 10 mm bleed on the wrap edges; copy must not run over a corner.",
  },
  {
    id: "vt-cover-wall",
    name: "Cover wall with returns",
    substrate: "Free-standing cover wall, returns each side",
    slots: ["pattern", "lockup", "qr"],
    ground: "repeat-white",
    orientation: "portrait",
    londonPanels: ["ldn-v19"],
    printNote:
      "Front face and returns are separate files. 100 mm bleed. Half-drop the lockup pattern so no row lines up across a join.",
  },
  {
    id: "vt-fascia",
    name: "Fascia plate",
    substrate: "Small fascia or header plate",
    slots: ["lockup"],
    ground: "house-gradient",
    orientation: "landscape",
    londonPanels: ["ldn-v37"],
    printNote: "Lockup only. Minimum clear space is 1.5× the T height even at this size.",
  },
];

const BY_PANEL = new Map<string, VenueTemplateFamily>();
for (const family of NEXT_VENUE_TEMPLATES) {
  for (const panelId of family.londonPanels) BY_PANEL.set(panelId, family);
}

/** The reusable template family a London sign belongs to, if it has one. */
export function venueTemplateFor(panel: { id: string } | string): VenueTemplateFamily | null {
  const id = typeof panel === "string" ? panel : panel.id;
  return BY_PANEL.get(id) ?? null;
}

export function venueTemplate(id: string): VenueTemplateFamily | null {
  return NEXT_VENUE_TEMPLATES.find((family) => family.id === id) ?? null;
}

/** The least a coverage read needs to know about a sign. */
export type VenueTemplatePanelLike = {
  id: string;
  name: string;
  room: string;
  trimW: number;
  trimH: number;
  bleedEdge: number;
};

export type VenueTemplateCoverage<P extends VenueTemplatePanelLike = VenueTemplatePanelLike> = {
  family: VenueTemplateFamily;
  /** Signs in the supplied set that this family already covers. */
  panels: P[];
  /** Smallest and largest trim seen on the family, in mm. */
  sizeRange: { minW: number; maxW: number; minH: number; maxH: number } | null;
  /** Bleed values the family has been produced at, in mm. */
  bleeds: number[];
};

export type VenueTemplateAudit<P extends VenueTemplatePanelLike = VenueTemplatePanelLike> = {
  coverage: VenueTemplateCoverage<P>[];
  /** Signs with no family yet — the next things worth templating. */
  unmatched: P[];
  covered: number;
  total: number;
  /** Share of the set that a new venue can start from a template, 0–1. */
  reuse: number;
};

/**
 * How much of a settled signage set is already reusable at the next venue.
 * Coverage is what saves time: a family carries the face shape, copy slots,
 * ground and print notes, so a new venue supplies only trim and copy.
 */
export function venueTemplateAudit<P extends VenueTemplatePanelLike>(
  panels: P[],
): VenueTemplateAudit<P> {
  const buckets = new Map<string, P[]>();
  const unmatched: P[] = [];
  for (const panel of panels) {
    const family = venueTemplateFor(panel.id);
    if (!family) {
      unmatched.push(panel);
      continue;
    }
    const list = buckets.get(family.id);
    if (list) list.push(panel);
    else buckets.set(family.id, [panel]);
  }
  const coverage = NEXT_VENUE_TEMPLATES.map((family) => {
    const list = buckets.get(family.id) ?? [];
    const sizeRange = list.length
      ? {
          minW: Math.min(...list.map((p) => p.trimW)),
          maxW: Math.max(...list.map((p) => p.trimW)),
          minH: Math.min(...list.map((p) => p.trimH)),
          maxH: Math.max(...list.map((p) => p.trimH)),
        }
      : null;
    return {
      family,
      panels: list,
      sizeRange,
      bleeds: [...new Set(list.map((p) => p.bleedEdge))].sort((a, b) => a - b),
    };
  });
  const covered = panels.length - unmatched.length;
  return {
    coverage,
    unmatched,
    covered,
    total: panels.length,
    reuse: panels.length ? covered / panels.length : 0,
  };
}
