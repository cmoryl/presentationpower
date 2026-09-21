// Room-by-room schedule for NEXT 2026 London (QEII Centre).
//
// This joins two issued records and invents nothing:
//   * the event space schedule (`next-london-space-use`) — which space is used
//     for what, and which division area holds it;
//   * the issued division programmes (`next-agenda-london-2026`) — the session
//     times and titles exactly as supplied.
//
// A space with no division programme on record is reported as "no programme
// recorded" rather than being filled with a guess, and where the programme's own
// printed room line disagrees with the space schedule, both are shown.

import { LONDON_2026_PROGRAMMES } from "@/lib/next-agenda-london-2026";
import type { AgendaSession } from "@/lib/next-agenda";
import {
  LONDON_SPACE_USE,
  spaceUseDivisionId,
  type SpaceUse,
} from "@/lib/next-london-space-use";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

export type RoomScheduleDay = {
  /** Day heading exactly as the programme records it. */
  meta: string;
  sessions: AgendaSession[];
};

export type RoomScheduleEntry = {
  /** The space exactly as the schedule writes it. */
  space: string;
  /** Room names on the floor plans this space covers. */
  rooms: string[];
  floor: string;
  sheetId: string;
  /** Function of the space as written, e.g. "Plenary". */
  fn?: string;
  /** The event held there, as written. */
  event: string;
  divisionId?: string;
  /** Programme days, empty when no programme is on record. */
  days: RoomScheduleDay[];
  /** The room line the programme itself prints, when it has one. */
  programmeRoomLine?: string;
  /** Plain-language notes about anything not on record or not agreeing. */
  notes: string[];
};

function programmeFor(use: SpaceUse) {
  const divisionId = spaceUseDivisionId(use);
  if (!divisionId) return { divisionId: undefined, programme: undefined };
  return { divisionId, programme: LONDON_2026_PROGRAMMES[divisionId] };
}

/** Letters only, doubled letters collapsed — the issued sheets carry variants
 *  such as "FLEMMING" for Fleming and "ST JAMES" for St. James. */
function loose(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
}

/** True when the programme's printed room line names one of this space's rooms. */
function roomLineAgrees(line: string, rooms: string[], space: string): boolean {
  const hay = loose(line);
  return [...rooms, space]
    .map((r) => loose(r))
    .filter(Boolean)
    .some((name) => hay.includes(name));
}

/** Every recorded space, in schedule order, with its sessions attached. */
export function londonRoomSchedule(): RoomScheduleEntry[] {
  return LONDON_SPACE_USE.map((use) => {
    const { divisionId, programme } = programmeFor(use);
    const notes: string[] = [];
    const days: RoomScheduleDay[] = [];
    const programmeRoomLine = programme?.locationLine || undefined;
    // A programme that prints a different room belongs to that other space, so
    // its times are not repeated here — the disagreement is reported instead.
    const belongsHere =
      !!programme &&
      (!programmeRoomLine || roomLineAgrees(programmeRoomLine, use.rooms, use.space));

    if (programme && belongsHere) {
      const source = programme.days?.length
        ? programme.days.map((d) => ({ meta: d.meta, sessions: d.sessions }))
        : [{ meta: programme.meta, sessions: programme.sessions }];
      for (const day of source) {
        if (day.sessions.length) days.push({ meta: day.meta, sessions: day.sessions });
      }
    } else if (programme && programmeRoomLine) {
      notes.push(
        `The ${use.event} programme prints “${programmeRoomLine}” as its room, so its session times are listed under that space rather than here. Both records are shown as issued — check with the venue before printing.`,
      );
    } else {
      notes.push(
        divisionId
          ? "No programme is on record for this division, so no session times are shown."
          : "This is a house space — the schedule records no session programme for it.",
      );
    }


    return {
      space: use.space,
      rooms: use.rooms,
      floor: use.floor,
      sheetId: use.sheetId,
      fn: use.fn,
      event: use.event,
      divisionId,
      days,
      programmeRoomLine,
      notes,
    };
  });
}

export type RoomScheduleFloor = {
  sheetId: string;
  title: string;
  entries: RoomScheduleEntry[];
};

/** The schedule grouped by floor, in the order the venue sheets run. */
export function londonRoomScheduleByFloor(
  entries = londonRoomSchedule(),
): RoomScheduleFloor[] {
  const floors: RoomScheduleFloor[] = LONDON_VENUE_SHEETS.filter(
    (s) => s.kind !== "room",
  ).map((s) => ({
    sheetId: s.id,
    title: s.title,
    entries: entries.filter((e) => e.sheetId === s.id),
  }));
  // Any space whose floor is not one of the sheets still has to be visible.
  const covered = new Set(floors.map((f) => f.sheetId));
  const orphans = entries.filter((e) => !covered.has(e.sheetId));
  for (const orphan of orphans) {
    const existing = floors.find((f) => f.sheetId === orphan.sheetId);
    if (existing) existing.entries.push(orphan);
    else
      floors.push({ sheetId: orphan.sheetId, title: orphan.floor, entries: [orphan] });
  }
  return floors.filter((f) => f.entries.length);
}

export type RoomScheduleSlot = {
  /** Day heading as written. */
  meta: string;
  /** Time exactly as written on the programmes. */
  time: string;
  rooms: { space: string; sheetId: string; title: string; divisionId?: string }[];
};

/**
 * Sessions that run at the same written time in more than one space, so a vendor
 * can see what has to be ready at once. Times are compared exactly as written —
 * nothing is rounded or reinterpreted.
 */
export function londonSharedTimeSlots(
  entries = londonRoomSchedule(),
): RoomScheduleSlot[] {
  const map = new Map<string, RoomScheduleSlot>();
  for (const entry of entries) {
    for (const day of entry.days) {
      for (const session of day.sessions) {
        const time = session.time.trim();
        if (!time) continue;
        const key = `${day.meta}|${time}`;
        const slot = map.get(key) ?? { meta: day.meta, time, rooms: [] };
        if (!slot.rooms.some((r) => r.space === entry.space))
          slot.rooms.push({
            space: entry.space,
            sheetId: entry.sheetId,
            title: session.title,
            divisionId: entry.divisionId,
          });
        map.set(key, slot);
      }
    }
  }
  return [...map.values()].filter((s) => s.rooms.length > 1);
}

/** Count of sessions recorded for a space, across every day. */
export function roomSessionCount(entry: RoomScheduleEntry): number {
  return entry.days.reduce((n, d) => n + d.sessions.length, 0);
}
