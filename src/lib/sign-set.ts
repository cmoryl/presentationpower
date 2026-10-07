// Sign sets — reuse approved sign templates at a new venue.
// Pure and client-safe: sign kinds, fact fields, filling a template from an
// event's published facts, and the status of each sign. Nothing is invented:
// a fact that isn't issued or published leaves its text hidden and flagged.

import type { KioskEdits } from "@/lib/next-california-kiosk-live";
import type { AssetRoom, AssetSession } from "@/lib/event-assets";

export const SIGN_KINDS = ["door", "column", "wall", "room_sign", "directional", "header", "kiosk", "floor", "stair", "other"] as const;
export type SignKind = (typeof SIGN_KINDS)[number];
export const SIGN_KIND_LABEL: Record<SignKind, string> = {
  door: "Door",
  column: "Column",
  wall: "Wall",
  room_sign: "Room sign",
  directional: "Directional",
  header: "Header",
  kiosk: "Kiosk",
  floor: "Floor wrap / vinyl",
  stair: "Stair wrap / clings",
  other: "Other",
};

/** Event facts a template text line can be linked to. */
export const FIELD_KEYS = ["event_name", "event_dates", "venue", "city", "room_name", "room_level", "room_sessions", "map_url"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export const FIELD_LABEL: Record<FieldKey, string> = {
  event_name: "Event name",
  event_dates: "Event dates",
  venue: "Venue name",
  city: "City",
  room_name: "Room name",
  room_level: "Room level",
  room_sessions: "Room schedule (from the agenda)",
  map_url: "Map web address",
};

export type SignTemplate = {
  id: string;
  name: string;
  kind: SignKind;
  layout_id: string;
  w_in: number;
  h_in: number;
  edits: KioskEdits;
  /** Template text line id → event fact it shows. Unlinked lines keep the template's words. */
  fields: Partial<Record<string, FieldKey>>;
  status: "draft" | "approved" | "rejected";
};

export type SignSpot = {
  id: string;
  label: string;
  kind: SignKind;
  floor_key: string | null;
  room: string | null;
  w_in: number | null;
  h_in: number | null;
  sides: number;
};

export type EventFacts = {
  eventName: string;
  dates: string;
  venue: string;
  city: string;
  /** Only when the map address intake item is received. */
  mapUrl: string;
  /** Published room list, or null when none is published. */
  rooms: AssetRoom[] | null;
  /** Published agenda sessions, or null when none is published. */
  sessions: AssetSession[] | null;
};

export type SignStatus = "ready" | "needs_text" | "needs_measuring" | "size_mismatch";
export const SIGN_STATUS_LABEL: Record<SignStatus | "no_template" | "qa_failed", string> = {
  ready: "Ready",
  needs_text: "Needs text",
  needs_measuring: "Needs measuring",
  size_mismatch: "Size doesn't match the template",
  no_template: "No template chosen",
  qa_failed: "Print check failed",
};

/** Sizes match when both sides are within ¼ in — artwork is never stretched to fit. */
export const SIZE_TOLERANCE_IN = 0.25;
export function sizeMatches(t: Pick<SignTemplate, "w_in" | "h_in">, s: Pick<SignSpot, "w_in" | "h_in">): boolean {
  if (s.w_in == null || s.h_in == null) return false;
  return Math.abs(Number(t.w_in) - Number(s.w_in)) <= SIZE_TOLERANCE_IN && Math.abs(Number(t.h_in) - Number(s.h_in)) <= SIZE_TOLERANCE_IN;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The published room that matches the spot's room, if any. */
export function roomFor(spot: Pick<SignSpot, "room">, rooms: AssetRoom[] | null): AssetRoom | null {
  if (!spot.room?.trim() || !rooms) return null;
  const want = norm(spot.room);
  return rooms.find((r) => norm(r.name) === want) ?? null;
}

/** A room's sessions from the published agenda, one line each, grouped by day. At most `max` lines. */
export function roomSchedule(room: string, sessions: AssetSession[] | null, max = 12): string {
  if (!sessions || !room.trim()) return "";
  const want = norm(room);
  const mine = sessions.filter((s) => s.kind === "session" && s.title.trim() && norm(s.room) === want);
  if (!mine.length) return "";
  const days = [...new Set(mine.map((s) => s.day))];
  const lines: string[] = [];
  for (const d of days) {
    if (days.length > 1 && d.trim()) lines.push(d);
    for (const s of mine.filter((x) => x.day === d)) lines.push(`${s.start}${s.end ? `–${s.end}` : ""}  ${s.title}`.trim());
  }
  return lines.slice(0, max).join("\n");
}

export type FilledSign = {
  edits: KioskEdits;
  /** Text line id → value filled in ("" when missing). */
  values: Record<string, string>;
  /** Plain-language reasons the sign isn't ready. */
  missing: string[];
  status: SignStatus;
};

/** Fill a template for one sign spot from the event's issued and published facts. */
export function fillSignFromEvent(template: SignTemplate, spot: SignSpot, facts: EventFacts): FilledSign {
  const missing: string[] = [];
  const values: Record<string, string> = {};
  const room = roomFor(spot, facts.rooms);
  const valueOf = (k: FieldKey): { v: string; why?: string } => {
    switch (k) {
      case "event_name": return { v: facts.eventName.trim(), why: "Event name not set" };
      case "event_dates": return { v: facts.dates.trim(), why: "Event dates not issued" };
      case "venue": return { v: facts.venue.trim(), why: "Venue name not set" };
      case "city": return { v: facts.city.trim(), why: "City not set" };
      case "map_url": return { v: facts.mapUrl.trim(), why: "Map web address not received" };
      case "room_name":
        if (!spot.room?.trim()) return { v: "", why: "No room set on this sign spot" };
        if (!facts.rooms) return { v: "", why: "No room list published" };
        return { v: room?.name ?? "", why: `“${spot.room}” isn't on the published room list` };
      case "room_level":
        if (!room) return { v: "", why: "Room not on the published room list" };
        return { v: room.level.trim(), why: `No level given for ${room.name}` };
      case "room_sessions":
        if (!facts.sessions) return { v: "", why: "No agenda published" };
        if (!room) return { v: "", why: "Room not on the published room list" };
        return { v: roomSchedule(room.name, facts.sessions), why: `No published sessions in ${room.name}` };
    }
  };
  const texts: NonNullable<KioskEdits["texts"]> = { ...(template.edits.texts ?? {}) };
  for (const [id, key] of Object.entries(template.fields)) {
    if (!key) continue;
    const { v, why } = valueOf(key);
    values[id] = v;
    if (v) texts[id] = { ...texts[id], text: v, hidden: false };
    else {
      // Never print the template's old wording for a missing fact.
      texts[id] = { ...texts[id], text: "", hidden: true };
      if (why && !missing.includes(why)) missing.push(why);
    }
  }
  const edits: KioskEdits = { ...template.edits, texts };
  const status: SignStatus =
    spot.w_in == null || spot.h_in == null ? "needs_measuring"
      : !sizeMatches(template, spot) ? "size_mismatch"
        : missing.length ? "needs_text" : "ready";
  return { edits, values, missing, status };
}

/** Approved templates that fit a spot: same kind first, then any kind at the same size. */
export function templatesForSpot(spot: SignSpot, templates: SignTemplate[]): SignTemplate[] {
  const ok = templates.filter((t) => t.status === "approved" && sizeMatches(t, spot));
  return [...ok.filter((t) => t.kind === spot.kind), ...ok.filter((t) => t.kind !== spot.kind)];
}

/** Template to use for a spot: the choice for its kind when it fits, else null. */
export function chosenTemplate(spot: SignSpot, choices: Partial<Record<SignKind, string>>, templates: SignTemplate[]): SignTemplate | null {
  const id = choices[spot.kind];
  return templates.find((t) => t.id === id && t.status === "approved") ?? null;
}

/** Choices worth copying from a past event: only approved templates still in the library. */
export function copyChoices(from: Partial<Record<string, string>>, templates: SignTemplate[]): Partial<Record<SignKind, string>> {
  const out: Partial<Record<SignKind, string>> = {};
  for (const k of SIGN_KINDS) {
    const id = from[k];
    if (id && templates.some((t) => t.id === id && t.status === "approved")) out[k] = id;
  }
  return out;
}

/** Edit key a built sign's changes are saved under (never a template's or kiosk's own key). */
export const eventSignEditKey = (signId: string) => `signset:${signId}`;

/** File name base for a sign in a set; always draft until a revision is published. */
export function signFileBase(eventId: string, spotLabel: string): string {
  const slug = spotLabel.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "sign";
  return `rdraft-${eventId}-${slug}`;
}
