// VENUE PLANS — one format every city in the NEXT series fills in.
//
// London (next-london-floorplan.ts) is where the map sheet apparatus was
// settled, and it stays the reference build. What it should NOT stay is the
// only venue that can be drawn: every city that follows needs the same kind of
// record — floors, room rectangles, doors, a stated orientation — without new
// code per venue.
//
// So the geometry a sheet needs is a plain record here. `floors` holds exactly
// the shape the renderer already accepts (`LondonFloorPlan`, passed as
// `FloorMapOptions.plan`), which is why a new venue reuses every sheet, key,
// card and export unchanged. Floor ids stay on the shared `LondonFloorId` set —
// EXT plus GF..6F — because the signage schedule, stored corrections and PDF
// paths are all keyed on them; a venue that calls GF "Arrival level" says so in
// the floor's own label.
//
// PROVENANCE IS PART OF THE RECORD, not a comment. `surveyed` says whether the
// rectangles came from a real drawing; `surveySource` and `surveyDate` say from
// what and when. Until a venue is surveyed, `planCaveat()` returns the
// not-to-scale line that must print on its sheets. Nothing here fabricates a
// dimension: a blank venue starts empty and stays honest about it.

import {
  LONDON_FLOOR_PLANS,
  clamp,
  type LondonFace,
  type LondonFloorPlan,
  type LondonMarkerOverrides,
  type LondonZone,
  type LondonZoneKind,
} from "@/lib/next-london-floorplan";
import { LONDON_FLOORS, LONDON_VENUE, type LondonFloorId } from "@/lib/next-london-signage";

/** A floor sheet, in the shape the map renderer already draws. */
export type VenueFloorPlan = LondonFloorPlan;
export type VenueZone = LondonZone;
export type VenueZoneKind = LondonZoneKind;

/** The floor slots a venue can fill. Shared with the signage schedule. */
export const VENUE_FLOOR_SLOTS = LONDON_FLOORS;

/** Zone kinds offered in the plan editor, in the order they are shown. */
export const VENUE_ZONE_KINDS: VenueZoneKind[] = [
  "auditorium",
  "room",
  "foyer",
  "circulation",
  "core",
  "hospitality",
  "exhibition",
  "terrace",
  "exterior",
];

export type VenuePlanRecord = {
  /** Present once the record has been saved. */
  id?: string;
  /** Short stable key used in file names and pin rows, e.g. "london-2026". */
  slug: string;
  /** Event series this venue belongs to. */
  eventId: string;
  /** How the venue is named in the build. */
  name: string;
  city: string;
  venue: string;
  datesLabel: string;
  producer: string;
  /** True only when the rectangles came off a real drawing. */
  surveyed: boolean;
  /** What the geometry was traced from — CAD file, scaled PDF, survey report. */
  surveySource: string;
  /** ISO date (yyyy-mm-dd) the geometry was traced or surveyed. */
  surveyDate: string | null;
  /** Extra line to print on every sheet, on top of the scale caveat. */
  caveat: string;
  floors: VenueFloorPlan[];
  updatedAt?: string;
};

/** The line that must print on a sheet drawn from this record. */
export function planCaveat(rec: VenuePlanRecord): string {
  const extra = rec.caveat.trim();
  if (rec.surveyed) {
    const from = [rec.surveySource.trim(), rec.surveyDate ?? ""].filter(Boolean).join(" · ");
    const head = from ? `To scale — traced from ${from}.` : "To scale.";
    return extra ? `${head} ${extra}` : head;
  }
  const head =
    "INSTALL DIAGRAM — NOT TO SCALE. Room rectangles are proportioned to published areas, not surveyed. Do not scale truss, wall runs or print from this sheet.";
  return extra ? `${head} ${extra}` : head;
}

/** A floor slot label, from the record first and the shared set as a fallback. */
export function venueFloorLabel(rec: VenuePlanRecord, floor: LondonFloorId): string {
  const own = rec.floors.find((f) => f.floor === floor);
  if (own?.label) return own.label;
  return VENUE_FLOOR_SLOTS.find((f) => f.id === floor)?.label ?? floor;
}

export function planForFloor(rec: VenuePlanRecord, floor: LondonFloorId): VenueFloorPlan | null {
  return rec.floors.find((f) => f.floor === floor) ?? null;
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`;
}

/** An empty floor at a workable default extent, ready to be filled in. */
export function blankVenueFloor(floor: LondonFloorId, label?: string): VenueFloorPlan {
  return {
    floor,
    label: label ?? VENUE_FLOOR_SLOTS.find((f) => f.id === floor)?.label ?? floor,
    w: 50,
    h: 40,
    orientation: "Orientation to be confirmed",
    zones: [],
    entries: [],
  };
}

/** A new room rectangle placed inside its floor without overhanging it. */
export function newVenueZone(
  plan: VenueFloorPlan,
  kind: VenueZoneKind = "room",
  label = "New room",
): VenueZone {
  const w = Math.min(12, Math.max(3, plan.w / 4));
  const h = Math.min(9, Math.max(3, plan.h / 4));
  return {
    id: nextId("vz"),
    label,
    kind,
    x: clamp(plan.w / 2 - w / 2, 0, Math.max(0, plan.w - w)),
    y: clamp(plan.h / 2 - h / 2, 0, Math.max(0, plan.h - h)),
    w,
    h,
    rooms: [label],
  };
}

/** A venue record with nothing invented — floors present, geometry empty. */
export function blankVenuePlan(slug: string, name: string): VenuePlanRecord {
  return {
    slug,
    eventId: "next",
    name,
    city: "",
    venue: "",
    datesLabel: "",
    producer: "",
    surveyed: false,
    surveySource: "",
    surveyDate: null,
    caveat: "",
    floors: [blankVenueFloor("GF"), blankVenueFloor("2F"), blankVenueFloor("3F")],
  };
}

/** The London build as a venue record — the reference the format was taken from. */
export function londonVenuePlan(): VenuePlanRecord {
  return {
    slug: "london-2026",
    eventId: "next",
    name: "TransPerfect NEXT 2026 — London",
    city: "London",
    venue: LONDON_VENUE.name,
    datesLabel: "24–25 September 2026",
    producer: "Bespoke",
    surveyed: false,
    surveySource:
      "QEII Centre published Floor by Floor plan pack, Spaces room pages and lift schedule",
    surveyDate: null,
    caveat: "Room roster, adjacency, cores and published areas are the venue's own.",
    floors: LONDON_FLOOR_PLANS.map((f) => structuredCloneish(f)),
  };
}

/**
 * A new venue started from London's geometry — a working stage set, so the show
 * can be laid out before the real plans arrive. Marked unsurveyed and carried
 * over, never presented as this venue's own measurements.
 */
export function venuePlanFromLondon(slug: string, name: string): VenuePlanRecord {
  const base = londonVenuePlan();
  return {
    ...base,
    slug,
    name,
    city: "",
    venue: "",
    datesLabel: "",
    producer: "",
    surveySource: "",
    caveat:
      "CARRIED OVER FROM LONDON — floors, rooms and sizes are the London build reused as a stage set, not this venue's layout. Replace each floor as the real plans arrive.",
    floors: base.floors.map((f) => structuredCloneish(f)),
  };
}

function structuredCloneish(plan: VenueFloorPlan): VenueFloorPlan {
  return {
    ...plan,
    zones: plan.zones.map((z) => ({ ...z, rooms: [...z.rooms] })),
    entries: plan.entries.map((e) => ({ ...e })),
  };
}

const FLOOR_IDS = new Set<string>(VENUE_FLOOR_SLOTS.map((f) => f.id));
const KIND_SET = new Set<string>(VENUE_ZONE_KINDS);

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Read a stored row or pasted payload into a record, dropping anything unusable. */
export function normalizeVenuePlan(raw: unknown): VenuePlanRecord {
  const r = (raw ?? {}) as Record<string, unknown>;
  const slug = str(r["slug"]).trim() || "venue";
  const base = blankVenuePlan(slug, str(r["name"]).trim() || slug);
  const floorsRaw = Array.isArray(r["floors"]) ? r["floors"] : [];
  const floors: VenueFloorPlan[] = [];
  for (const f of floorsRaw) {
    const rec = (f ?? {}) as Record<string, unknown>;
    const floor = str(rec["floor"]);
    if (!FLOOR_IDS.has(floor)) continue;
    if (floors.some((x) => x.floor === floor)) continue;
    const w = Math.max(4, num(rec["w"], 50));
    const h = Math.max(4, num(rec["h"], 40));
    const zonesRaw = Array.isArray(rec["zones"]) ? rec["zones"] : [];
    const entriesRaw = Array.isArray(rec["entries"]) ? rec["entries"] : [];
    floors.push({
      floor: floor as LondonFloorId,
      label: str(rec["label"]) || venueSlotLabel(floor),
      w,
      h,
      orientation: str(rec["orientation"], "Orientation to be confirmed"),
      zones: zonesRaw.flatMap((z) => {
        const zr = (z ?? {}) as Record<string, unknown>;
        const kind = str(zr["kind"], "room");
        const zw = Math.max(0.5, num(zr["w"], 4));
        const zh = Math.max(0.5, num(zr["h"], 4));
        const zone: VenueZone = {
          id: str(zr["id"]) || nextId("vz"),
          label: str(zr["label"], "Room"),
          kind: (KIND_SET.has(kind) ? kind : "room") as VenueZoneKind,
          x: clamp(num(zr["x"], 0), 0, Math.max(0, w - zw)),
          y: clamp(num(zr["y"], 0), 0, Math.max(0, h - zh)),
          w: Math.min(zw, w),
          h: Math.min(zh, h),
          rooms: Array.isArray(zr["rooms"])
            ? (zr["rooms"] as unknown[]).map((x) => str(x)).filter(Boolean)
            : [],
        };
        const note = str(zr["note"]).trim();
        if (note) zone.note = note;
        return [zone];
      }),
      entries: entriesRaw.flatMap((e) => {
        const er = (e ?? {}) as Record<string, unknown>;
        return [
          {
            label: str(er["label"], "Door"),
            x: clamp(num(er["x"], 0), 0, w),
            y: clamp(num(er["y"], 0), 0, h),
          },
        ];
      }),
    });
  }
  const surveyDate = str(r["surveyDate"] ?? r["survey_date"]).slice(0, 10);
  return {
    ...base,
    id: str(r["id"]) || undefined,
    slug,
    eventId: str(r["eventId"] ?? r["event_id"], "next") || "next",
    name: str(r["name"]).trim() || slug,
    city: str(r["city"]),
    venue: str(r["venue"]),
    datesLabel: str(r["datesLabel"] ?? r["dates_label"]),
    producer: str(r["producer"]),
    surveyed: r["surveyed"] === true,
    surveySource: str(r["surveySource"] ?? r["survey_source"]),
    surveyDate: surveyDate || null,
    caveat: str(r["caveat"]),
    floors: floors.length ? floors : base.floors,
    updatedAt: str(r["updatedAt"] ?? r["updated_at"]) || undefined,
  };
}

/** What is still missing before this venue's sheets can be handed to a crew. */
export function venuePlanGaps(rec: VenuePlanRecord): string[] {
  const gaps: string[] = [];
  if (!rec.city.trim()) gaps.push("City not filled in.");
  if (!rec.venue.trim()) gaps.push("Venue not filled in.");
  if (!rec.datesLabel.trim()) gaps.push("Dates not filled in.");
  const empty = rec.floors.filter((f) => !f.zones.length);
  if (empty.length)
    gaps.push(
      `${empty.length} floor${empty.length === 1 ? "" : "s"} have no rooms yet: ${empty
        .map((f) => f.label)
        .join(", ")}.`,
    );
  const noDoors = rec.floors.filter((f) => f.zones.length && !f.entries.length);
  if (noDoors.length)
    gaps.push(`No doors marked on: ${noDoors.map((f) => f.label).join(", ")}.`);
  const vague = rec.floors.filter((f) => /to be confirmed/i.test(f.orientation));
  if (vague.length)
    gaps.push(`Orientation line still unconfirmed on: ${vague.map((f) => f.label).join(", ")}.`);
  if (!rec.surveyed)
    gaps.push("Not surveyed — sheets print the not-to-scale line until a real plan is traced in.");
  return gaps;
}

function venueSlotLabel(floor: string): string {
  return VENUE_FLOOR_SLOTS.find((f) => f.id === floor)?.label ?? floor;
}

/** A saved pin — one sign's real position at one venue. */
export type VenuePin = {
  venueSlug: string;
  floor: LondonFloorId;
  assetId: string;
  x: number;
  y: number;
  face?: LondonFace;
  confirmed: boolean;
  confirmedAt?: string | null;
  note?: string;
};

/** Saved pins as the override map the plan and every sheet already read. */
export function pinsToOverrides(pins: readonly VenuePin[]): LondonMarkerOverrides {
  const out: LondonMarkerOverrides = {};
  for (const p of pins) {
    out[p.assetId] = p.face ? { x: p.x, y: p.y, face: p.face } : { x: p.x, y: p.y };
  }
  return out;
}

/** Read stored pin rows into pins, dropping anything unusable. */
export function normalizeVenuePins(rows: readonly unknown[]): VenuePin[] {
  const out: VenuePin[] = [];
  for (const row of rows) {
    const r = (row ?? {}) as Record<string, unknown>;
    const floor = str(r["floor"]);
    const assetId = str(r["asset_id"] ?? r["assetId"]);
    if (!assetId || !FLOOR_IDS.has(floor)) continue;
    const pin: VenuePin = {
      venueSlug: str(r["venue_slug"] ?? r["venueSlug"]),
      floor: floor as LondonFloorId,
      assetId,
      x: num(r["x"], 0),
      y: num(r["y"], 0),
      confirmed: r["confirmed"] === true,
      confirmedAt: str(r["confirmed_at"] ?? r["confirmedAt"]) || null,
      note: str(r["note"]) || undefined,
    };
    const face = str(r["face"]);
    if (face) pin.face = face as LondonFace;
    out.push(pin);
  }
  return out;
}

/** How far along a venue's pin sign-off is. */
export function pinProgress(
  pins: readonly VenuePin[],
  totalAssets: number,
): { placed: number; confirmed: number; total: number; done: boolean } {
  const placed = pins.length;
  const confirmed = pins.filter((p) => p.confirmed).length;
  return {
    placed,
    confirmed,
    total: totalAssets,
    done: totalAssets > 0 && confirmed >= totalAssets,
  };
}
