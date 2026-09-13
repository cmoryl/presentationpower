// Active event knowledge — what each venue build teaches, kept in a form the
// next venue can search.
//
// Two problems this solves. The lessons log (`docs/EVENT-LESSONS.md`) carries
// reasoning but only a human reads it. The signage data carries measured facts
// but only London's own code reads them. Neither is reachable when someone
// starts a new city and asks "what size do these usually run at, and what went
// wrong last time?".
//
// So every event build harvests into one store: template families, measured
// panel specs, grounds, substrates, the lesson log, and the outcome of every
// published live file. Each record is embedded once and searched semantically.
//
// Pure module: no Supabase, no env, no fetch — safe to unit test.

export const EVENT_KNOWLEDGE_EMBEDDING_MODEL = "google/gemini-embedding-2";
export const EVENT_KNOWLEDGE_DIMS = 3072;

/** Records below this cosine similarity are noise, not precedent. */
export const MIN_EVENT_KNOWLEDGE_SIMILARITY = 0.24;

export type EventKnowledgeKind =
  /** Measured trim, bleed, raster and band facts for a real printed face. */
  | "spec"
  /** Where a family goes in a venue, and how many. */
  | "placement"
  /** Ground/gradient treatment settled on for a family. */
  | "ground"
  /** What the sign is physically made of, and the print notes that travel with it. */
  | "substrate"
  /** A judgement call, mistake or rejected approach. */
  | "lesson"
  /** Something that actually shipped — a published live file. */
  | "outcome";

export type EventKnowledgeRecord = {
  eventId: string;
  city: string;
  venue: string;
  templateFamilyId: string | null;
  panelId: string | null;
  kind: EventKnowledgeKind;
  title: string;
  body: string;
  facts: Record<string, unknown>;
  source: "harvest" | "publish" | "lesson-log" | "manual";
  /** Stable identity so re-harvesting updates rather than duplicates. */
  fingerprint: string;
};

export type EventKnowledgeHit = EventKnowledgeRecord & {
  id: string;
  similarity: number;
};

/**
 * Stable identity for a record. Deliberately excludes the body: when a spec or
 * a lesson is revised, the same fingerprint updates in place instead of leaving
 * a stale twin behind that search can still return.
 */
export function eventKnowledgeFingerprint(
  parts: Pick<EventKnowledgeRecord, "eventId" | "kind"> & {
    templateFamilyId?: string | null;
    panelId?: string | null;
    title: string;
  },
): string {
  return [
    parts.eventId,
    parts.kind,
    parts.templateFamilyId ?? "-",
    parts.panelId ?? "-",
    parts.title.trim().toLowerCase().replace(/\s+/g, " "),
  ].join("|");
}

/**
 * The text that gets embedded. City, venue and family are included on purpose:
 * a search for "Berlin lift wrap bleed" should reach a London lift wrap record,
 * and the family name is often the only word two venues share.
 */
export function eventKnowledgeText(record: EventKnowledgeRecord): string {
  const facts = Object.entries(record.facts)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("; ");
  return [
    `${record.city} — ${record.venue}`.trim(),
    record.templateFamilyId ? `family ${record.templateFamilyId}` : "",
    record.panelId ? `sign ${record.panelId}` : "",
    `${record.kind}: ${record.title}`,
    record.body,
    facts,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);
}

// ---------------------------------------------------------------------------
// Harvest — turn the build's own data into knowledge records
// ---------------------------------------------------------------------------

export type HarvestVenue = {
  eventId: string;
  city: string;
  venue: string;
};

export type HarvestPanel = {
  id: string;
  name: string;
  room: string;
  floor?: string;
  ground?: string;
  style?: string;
  trimW: number;
  trimH: number;
  bleedEdge: number;
  rasterPx?: string;
  rasterPpi?: number;
  bandMm?: number;
};

export type HarvestFamily = {
  id: string;
  name: string;
  substrate: string;
  slots: string[];
  ground: string;
  orientation: string;
  printNote: string;
};

const mm = (n: number) => `${Math.round(n)}mm`;

/** One measured-spec record per printed face. */
export function harvestPanelSpecs(
  venue: HarvestVenue,
  panels: readonly HarvestPanel[],
  familyFor: (panelId: string) => HarvestFamily | null,
): EventKnowledgeRecord[] {
  return panels.map((panel) => {
    const family = familyFor(panel.id);
    const title = `${panel.name} — ${panel.room}`;
    const body = [
      `${panel.name} in ${panel.room}${panel.floor ? ` (${panel.floor})` : ""} printed at ${mm(panel.trimW)} × ${mm(panel.trimH)} trim with ${mm(panel.bleedEdge)} bleed on every edge.`,
      family ? `It belongs to the ${family.name} family (${family.substrate}).` : "No template family yet — this face is still bespoke.",
      panel.ground ? `Ground: ${panel.ground}${panel.style ? ` (${panel.style})` : ""}.` : "",
      panel.bandMm
        ? `Worst-case flat-tone run measured ${mm(panel.bandMm)}, which is what banding risk is judged on.`
        : "",
      panel.rasterPx ? `Packaged raster ${panel.rasterPx} at ${panel.rasterPpi ?? "?"}ppi.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      eventId: venue.eventId,
      city: venue.city,
      venue: venue.venue,
      templateFamilyId: family?.id ?? null,
      panelId: panel.id,
      kind: "spec",
      title,
      body,
      facts: {
        trimW: panel.trimW,
        trimH: panel.trimH,
        bleedEdge: panel.bleedEdge,
        floor: panel.floor ?? null,
        room: panel.room,
        style: panel.style ?? null,
        bandMm: panel.bandMm ?? null,
        rasterPx: panel.rasterPx ?? null,
        rasterPpi: panel.rasterPpi ?? null,
      },
      source: "harvest",
      fingerprint: eventKnowledgeFingerprint({
        eventId: venue.eventId,
        kind: "spec",
        templateFamilyId: family?.id ?? null,
        panelId: panel.id,
        title,
      }),
    };
  });
}

/** One substrate/placement pair per template family that this venue actually used. */
export function harvestFamilyKnowledge(
  venue: HarvestVenue,
  families: readonly HarvestFamily[],
  panelsForFamily: (familyId: string) => readonly HarvestPanel[],
): EventKnowledgeRecord[] {
  const out: EventKnowledgeRecord[] = [];
  for (const family of families) {
    const used = panelsForFamily(family.id);
    if (!used.length) continue;
    const widths = used.map((p) => p.trimW);
    const heights = used.map((p) => p.trimH);
    const bleeds = [...new Set(used.map((p) => p.bleedEdge))].sort((a, b) => a - b);
    const rooms = [...new Set(used.map((p) => p.room))];

    const substrateTitle = `${family.name} — substrate and print notes`;
    out.push({
      eventId: venue.eventId,
      city: venue.city,
      venue: venue.venue,
      templateFamilyId: family.id,
      panelId: null,
      kind: "substrate",
      title: substrateTitle,
      body: [
        `${family.name}: ${family.substrate}. ${family.orientation} face carrying ${family.slots.join(", ")}.`,
        `Ground is built as ${family.ground}.`,
        `Print note that travels with the family: ${family.printNote}`,
      ].join(" "),
      facts: {
        substrate: family.substrate,
        slots: family.slots.join(", "),
        ground: family.ground,
        orientation: family.orientation,
      },
      source: "harvest",
      fingerprint: eventKnowledgeFingerprint({
        eventId: venue.eventId,
        kind: "substrate",
        templateFamilyId: family.id,
        title: substrateTitle,
      }),
    });

    const placementTitle = `${family.name} — how many and where at ${venue.city}`;
    out.push({
      eventId: venue.eventId,
      city: venue.city,
      venue: venue.venue,
      templateFamilyId: family.id,
      panelId: null,
      kind: "placement",
      title: placementTitle,
      body: [
        `${venue.city} ran ${used.length} × ${family.name}.`,
        `Locations: ${rooms.join(", ")}.`,
        `Trim ranged ${mm(Math.min(...widths))}–${mm(Math.max(...widths))} wide by ${mm(Math.min(...heights))}–${mm(Math.max(...heights))} high.`,
        `Bleed used: ${bleeds.map(mm).join(", ")}.`,
        "Treat these sizes as precedent to sanity-check against, never as the new venue's truth — confirm on survey.",
      ].join(" "),
      facts: {
        quantity: used.length,
        minW: Math.min(...widths),
        maxW: Math.max(...widths),
        minH: Math.min(...heights),
        maxH: Math.max(...heights),
        bleeds: bleeds.join(", "),
        rooms: rooms.join(", "),
      },
      source: "harvest",
      fingerprint: eventKnowledgeFingerprint({
        eventId: venue.eventId,
        kind: "placement",
        templateFamilyId: family.id,
        title: placementTitle,
      }),
    });
  }
  return out;
}

/** One ground record per gradient treatment the venue settled on. */
export function harvestGrounds(
  venue: HarvestVenue,
  styles: Record<string, { label: string; note: string; stops: string[] }>,
  panels: readonly HarvestPanel[],
): EventKnowledgeRecord[] {
  return Object.entries(styles).map(([id, style]) => {
    const used = panels.filter((p) => p.style === id);
    const title = `${style.label} ground (${id})`;
    return {
      eventId: venue.eventId,
      city: venue.city,
      venue: venue.venue,
      templateFamilyId: null,
      panelId: null,
      kind: "ground" as const,
      title,
      body: [
        `${style.label}: ${style.note}`,
        `Stops: ${style.stops.join(" → ")}.`,
        used.length
          ? `Used on ${used.length} ${venue.city} sign${used.length === 1 ? "" : "s"}: ${used.slice(0, 8).map((p) => p.name).join(", ")}${used.length > 8 ? "…" : ""}.`
          : `Approved but not used at ${venue.city}.`,
      ].join(" "),
      facts: { stops: style.stops.join(", "), usedOn: used.length },
      source: "harvest" as const,
      fingerprint: eventKnowledgeFingerprint({
        eventId: venue.eventId,
        kind: "ground",
        title,
      }),
    };
  });
}

// ---------------------------------------------------------------------------
// Lesson log — parse `docs/EVENT-LESSONS.md` into searchable records
// ---------------------------------------------------------------------------

export type ParsedLesson = {
  date: string;
  title: string;
  context: string;
  whatHappened: string;
  rule: string;
  enforcedBy: string;
};

const FIELD = (block: string, label: string): string => {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
  return (re.exec(block)?.[1] ?? "").replace(/\s+/g, " ").trim();
};

/**
 * Reads the lesson log's `### YYYY-MM — Title` entries. The template block at
 * the top of the file is fenced, so it is skipped; superseded entries are kept
 * (search should still surface them, with their marker intact).
 */
export function parseEventLessons(markdown: string): ParsedLesson[] {
  const body = markdown.replace(/```[\s\S]*?```/g, "");
  const out: ParsedLesson[] = [];
  const re = /^###\s+([\d]{4}(?:-[\d]{2}){0,2})\s+—\s+(.+)$/gm;
  const heads: Array<{ date: string; title: string; at: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    heads.push({ date: m[1], title: m[2].trim(), at: m.index, end: re.lastIndex });
  }
  for (let i = 0; i < heads.length; i += 1) {
    const head = heads[i];
    const block = body.slice(head.end, heads[i + 1]?.at ?? body.length);
    out.push({
      date: head.date,
      title: head.title,
      context: FIELD(block, "Context"),
      whatHappened: FIELD(block, "What happened"),
      rule: FIELD(block, "Rule now"),
      enforcedBy: FIELD(block, "Enforced by"),
    });
  }
  return out;
}

export function lessonRecords(venue: HarvestVenue, lessons: readonly ParsedLesson[]): EventKnowledgeRecord[] {
  return lessons.map((lesson) => ({
    eventId: venue.eventId,
    city: venue.city,
    venue: venue.venue,
    templateFamilyId: null,
    panelId: null,
    kind: "lesson" as const,
    title: lesson.title,
    body: [
      lesson.context ? `Context: ${lesson.context}` : "",
      lesson.whatHappened ? `What happened: ${lesson.whatHappened}` : "",
      lesson.rule ? `Rule now: ${lesson.rule}` : "",
      lesson.enforcedBy ? `Enforced by: ${lesson.enforcedBy}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    facts: { date: lesson.date, enforcedBy: lesson.enforcedBy || "judgement only" },
    source: "lesson-log" as const,
    fingerprint: eventKnowledgeFingerprint({
      eventId: venue.eventId,
      kind: "lesson",
      title: lesson.title,
    }),
  }));
}

/** A published live file is the only proof of what actually shipped. */
export function outcomeRecord(args: {
  venue: HarvestVenue;
  panelId: string;
  panelName: string;
  templateFamilyId: string | null;
  version: number;
  filename: string;
  trimW?: number | null;
  trimH?: number | null;
  note?: string | null;
}): EventKnowledgeRecord {
  const title = `${args.panelName} — shipped live file`;
  const size =
    args.trimW && args.trimH ? ` at ${mm(args.trimW)} × ${mm(args.trimH)} trim` : "";
  return {
    eventId: args.venue.eventId,
    city: args.venue.city,
    venue: args.venue.venue,
    templateFamilyId: args.templateFamilyId,
    panelId: args.panelId,
    kind: "outcome",
    title,
    body: [
      `${args.panelName} shipped as version ${args.version} (${args.filename})${size}.`,
      args.note ? `Note recorded at publish: ${args.note}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    facts: {
      version: args.version,
      filename: args.filename,
      trimW: args.trimW ?? null,
      trimH: args.trimH ?? null,
    },
    source: "publish",
    fingerprint: eventKnowledgeFingerprint({
      eventId: args.venue.eventId,
      kind: "outcome",
      templateFamilyId: args.templateFamilyId,
      panelId: args.panelId,
      title,
    }),
  };
}

/** What a new city gets back: precedent grouped so it reads as guidance. */
export type EventKnowledgeBrief = {
  specs: EventKnowledgeHit[];
  placement: EventKnowledgeHit[];
  lessons: EventKnowledgeHit[];
  other: EventKnowledgeHit[];
};

export function groupEventKnowledge(hits: readonly EventKnowledgeHit[]): EventKnowledgeBrief {
  const brief: EventKnowledgeBrief = { specs: [], placement: [], lessons: [], other: [] };
  for (const hit of hits) {
    if (hit.similarity < MIN_EVENT_KNOWLEDGE_SIMILARITY) continue;
    if (hit.kind === "spec") brief.specs.push(hit);
    else if (hit.kind === "placement") brief.placement.push(hit);
    else if (hit.kind === "lesson") brief.lessons.push(hit);
    else brief.other.push(hit);
  }
  return brief;
}
