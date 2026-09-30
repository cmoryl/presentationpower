// Event assets — agendas and room lists added in the app by build users.
// Client-safe: types, flags, conversion to agenda-board days, production gates.
// Nothing here invents a value: blanks stay blank and are flagged.

import type { AgendaDay, AgendaParallel, AgendaSession } from "@/lib/next-agenda";

export type AssetSession = {
  /** Day heading as issued, e.g. "Tuesday, October 27, 2026". */
  day: string;
  start: string;
  end: string;
  title: string;
  speakers: string;
  room: string;
  division: string;
  kind: "session" | "break";
};

export type AssetRoom = { name: string; level: string; capacity: string };

export type AssetStatus = "draft" | "published";

export const blankSession = (day = ""): AssetSession => ({
  day, start: "", end: "", title: "", speakers: "", room: "", division: "", kind: "session",
});
export const blankRoom = (): AssetRoom => ({ name: "", level: "", capacity: "" });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Warnings per session: missing fields, and titles not found in the source text. */
export function sessionFlags(s: AssetSession, sourceText?: string): string[] {
  const f: string[] = [];
  if (!s.day.trim()) f.push("No day");
  if (!s.start.trim()) f.push("No start time");
  if (!s.title.trim()) f.push("No title");
  if (s.kind === "session" && !s.room.trim()) f.push("Room to be confirmed");
  if (sourceText && s.title.trim()) {
    const src = norm(sourceText);
    if (!src.includes(norm(s.title))) f.push("Title not found in the source — check it");
  }
  return f;
}

export function roomFlags(r: AssetRoom, sourceText?: string): string[] {
  const f: string[] = [];
  if (!r.name.trim()) f.push("No name");
  if (sourceText && r.name.trim() && !norm(sourceText).includes(norm(r.name))) f.push("Name not found in the source — check it");
  return f;
}

/** Clean AI/imported rows into the stored shape (strings only, trimmed). */
export function cleanSessions(rows: unknown): AssetSession[] {
  if (!Array.isArray(rows)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
  return rows.slice(0, 400).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      day: str(o.day), start: str(o.start), end: str(o.end), title: str(o.title),
      speakers: str(o.speakers), room: str(o.room), division: str(o.division),
      kind: o.kind === "break" ? "break" : "session",
    } satisfies AssetSession;
  });
}

export function cleanRooms(rows: unknown): AssetRoom[] {
  if (!Array.isArray(rows)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
  return rows.slice(0, 400).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return { name: str(o.name), level: str(o.level), capacity: str(o.capacity) };
  }).filter((r) => r.name);
}

const timeRange = (s: AssetSession) => (s.end ? `${s.start}-${s.end}` : s.start);

/**
 * Board days from a published agenda. Sessions sharing a day and start time
 * share one band (first = main row, the rest = parallel cards). When a
 * division is given, only sessions for that division or with no division print.
 */
export function agendaDaysFromSessions(sessions: AssetSession[], divisionId?: string): AgendaDay[] {
  const want = (s: AssetSession) =>
    !divisionId || !s.division || norm(s.division) === norm(divisionId) || norm(s.division) === "all";
  const days: AgendaDay[] = [];
  const byDay = new Map<string, AgendaDay>();
  for (const s of sessions.filter(want)) {
    let d = byDay.get(s.day);
    if (!d) { d = { label: "", meta: s.day.toUpperCase(), sessions: [] }; byDay.set(s.day, d); days.push(d); }
    const last = d.sessions[d.sessions.length - 1] as (AgendaSession & { _start?: string }) | undefined;
    if (last && last._start === s.start && s.start) {
      const p: AgendaParallel = { time: timeRange(s), title: s.title, speaker: s.speakers, detail: "", room: s.room };
      last.parallels = [...(last.parallels ?? []), p];
      last.parallel = last.parallels[0] ?? null;
      continue;
    }
    const row: AgendaSession & { _start?: string } = {
      time: timeRange(s), title: s.title, detail: s.speakers, track: "", muted: s.kind === "break", _start: s.start,
    };
    d.sessions.push(row);
  }
  for (const d of days) for (const r of d.sessions) delete (r as { _start?: string })._start;
  return days;
}

// ── production status ────────────────────────────────────────────────────────

export type Gate = "locked" | "ready" | "pending";
export type GateRow = { id: string; gate: Gate; title: string; detail: string; action?: { label: string; section?: string; to?: "maps" | "kiosks" } };

export type AssetState = {
  agenda: { version: number; sessions: AssetSession[] } | null;
  rooms: { version: number; rooms: AssetRoom[] } | null;
  floors: number;
};

/** Status rows for rooms, arrows and agendas, worked out from what is published. */
export function assetGates(s: AssetState): GateRow[] {
  const talks = s.agenda?.sessions.filter((x) => x.kind === "session") ?? [];
  const noRoom = talks.filter((x) => !x.room.trim()).length;
  const roomsOk = !!s.rooms && s.rooms.rooms.length > 0;
  return [
    s.floors > 0
      ? { id: "floors", gate: "ready", title: "Floor plans", detail: `${s.floors} level${s.floors === 1 ? "" : "s"} loaded in the venue maps.`, action: { label: "Open maps", to: "maps" } }
      : { id: "floors", gate: "pending", title: "Floor plans", detail: "Upload the venue floor plans to unlock maps and arrows.", action: { label: "Add it", section: "floors" } },
    roomsOk
      ? { id: "rooms", gate: "ready", title: "Room list", detail: `Version ${s.rooms!.version} published · ${s.rooms!.rooms.length} rooms.`, action: { label: "Update", section: "rooms" } }
      : { id: "rooms", gate: "pending", title: "Room list", detail: "Room signage is built once a room list is published.", action: { label: "Add it", section: "rooms" } },
    s.floors > 0 && roomsOk
      ? { id: "arrows", gate: "ready", title: "Directional arrows", detail: "Floor plans and rooms are in; routes can be placed on the maps.", action: { label: "Open maps", to: "maps" } }
      : { id: "arrows", gate: "pending", title: "Directional arrows", detail: "Needs floor plans and a published room list.", action: { label: "Add it", section: s.floors > 0 ? "rooms" : "floors" } },
    !s.agenda
      ? { id: "agendas", gate: "pending", title: "Division agendas", detail: "Publish the programme to put it on the agenda boards.", action: { label: "Add it", section: "agenda" } }
      : noRoom
        ? { id: "agendas", gate: "pending", title: "Division agendas", detail: `Version ${s.agenda.version} published · ${noRoom} of ${talks.length} sessions still need a room.`, action: { label: "Add rooms", section: "agenda" } }
        : { id: "agendas", gate: "ready", title: "Division agendas", detail: `Version ${s.agenda.version} published · ${talks.length} sessions, all with rooms.`, action: { label: "Update", section: "agenda" } },
  ];
}
