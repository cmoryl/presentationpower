// Shared house times across the division agendas.
//
// Each division board is authored on its own, so a registration window, lunch
// or reception that drifts off the time the rest of the event keeps used to go
// unnoticed — every board looked internally correct. This reads the issued
// programmes, works out the time the majority of divisions actually keep for
// each shared slot, and names the boards that differ.
//
// It never rewrites a programme: a divergent time can be perfectly correct (a
// division really does open registration later), so this reports, and a person
// decides. Breaks are deliberately not checked — each division sets its own.

import {
  AGENDA_DIVISIONS,
  AGENDA_EVENT_AREA_IDS,
  agendaProgramme,
  type AgendaSession,
} from "./next-agenda";


export type HouseSlotKind = "registration" | "lunch" | "reception";

type SlotSpec = {
  kind: HouseSlotKind;
  label: string;
  /** Lower-case title fragments that mark this housekeeping row. */
  match: string[];
};

const SLOTS: SlotSpec[] = [
  { kind: "registration", label: "Registration", match: ["registration"] },
  { kind: "lunch", label: "Lunch", match: ["lunch"] },
  {
    kind: "reception",
    label: "Reception",
    match: ["cocktail", "reception", "evening reception"],
  },
];

export type HouseSlotEntry = {
  divisionId: string;
  divisionName: string;
  time: string;
  /** The row exactly as printed, so a reviewer can see what was compared. */
  title: string;
};

export type HouseSlotReport = {
  kind: HouseSlotKind;
  label: string;
  /** 1-based day of the programme this slot sits on. */
  day: number;
  /** The time the majority of divisions keep, or null when none agree. */
  houseTime: string | null;
  /** Boards on the house time. */
  agreeing: HouseSlotEntry[];
  /** Boards off the house time — what a brand lead needs to look at. */
  drifting: HouseSlotEntry[];
  /** Boards with no row of this kind on this day at all. */
  missing: { divisionId: string; divisionName: string }[];
};

/** How many boards must share a time before it counts as the house time. */
export const HOUSE_TIME_QUORUM = 3;

function rowsForDay(divisionId: string, day: number): AgendaSession[] {
  const programme = agendaProgramme(divisionId);
  const days = programme.days ?? [];
  if (days.length) return days[day - 1]?.sessions ?? [];
  return day === 1 ? (programme.sessions ?? []) : [];
}

function dayCount(divisionId: string): number {
  const programme = agendaProgramme(divisionId);
  return programme.days?.length ? programme.days.length : 1;
}

/** Normalised time text, so "11:30 AM-1:30 PM" and "11:30 am - 1:30 pm" match. */
export function normaliseHouseTime(time: string): string {
  return time.replace(/\s+/g, "").replace(/[–—]/g, "-").toUpperCase();
}

function findSlot(rows: AgendaSession[], spec: SlotSpec): AgendaSession | null {
  for (const row of rows) {
    const title = (row.title ?? "").trim().toLowerCase();
    if (!title) continue;
    if (spec.match.some((m) => title.includes(m))) return row;
  }
  return null;
}

/**
 * The shared-slot picture across every division programme.
 *
 * Divisions are compared day by day: a board with one day is only ever compared
 * against other boards' day 1, so a single-day programme is never reported as
 * missing a second-day lunch.
 */
export function agendaHouseSlotReports(divisionIds?: string[]): HouseSlotReport[] {
  // Event areas (the Innovation Lounge stage) keep their own timings and have no
  // registration, lunch or reception of their own, so they are never compared.
  const ids =
    divisionIds ??
    AGENDA_DIVISIONS.filter((d) => !AGENDA_EVENT_AREA_IDS.includes(d.id)).map((d) => d.id);
  const nameOf = new Map(AGENDA_DIVISIONS.map((d) => [d.id, d.name] as const));
  const maxDays = ids.reduce((m, id) => Math.max(m, dayCount(id)), 1);
  const reports: HouseSlotReport[] = [];

  for (let day = 1; day <= maxDays; day += 1) {
    for (const spec of SLOTS) {
      const entries: HouseSlotEntry[] = [];
      const missing: { divisionId: string; divisionName: string }[] = [];
      for (const id of ids) {
        if (dayCount(id) < day) continue; // this division has no such day
        const divisionName = nameOf.get(id) ?? id;
        const row = findSlot(rowsForDay(id, day), spec);
        const time = (row?.time ?? "").trim();
        if (!row || !time) {
          missing.push({ divisionId: id, divisionName });
          continue;
        }
        entries.push({ divisionId: id, divisionName, time, title: row.title ?? "" });
      }
      if (!entries.length) continue;

      const counts = new Map<string, number>();
      for (const e of entries) {
        const key = normaliseHouseTime(e.time);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      let topKey = "";
      let topCount = 0;
      for (const [key, count] of counts) {
        // A tie keeps the first key seen rather than picking a winner at random.
        if (count > topCount) {
          topKey = key;
          topCount = count;
        }
      }
      const established = topCount >= HOUSE_TIME_QUORUM && topCount * 2 > entries.length;
      const houseEntry = established
        ? (entries.find((e) => normaliseHouseTime(e.time) === topKey) ?? null)
        : null;

      reports.push({
        kind: spec.kind,
        label: spec.label,
        day,
        houseTime: houseEntry ? houseEntry.time : null,
        agreeing: established
          ? entries.filter((e) => normaliseHouseTime(e.time) === topKey)
          : [],
        drifting: established
          ? entries.filter((e) => normaliseHouseTime(e.time) !== topKey)
          : [],
        missing,
      });
    }
  }
  return reports;
}

/** Only the slots with something a person needs to look at. */
export function agendaHouseSlotDrift(divisionIds?: string[]): HouseSlotReport[] {
  return agendaHouseSlotReports(divisionIds).filter((r) => r.drifting.length > 0);
}

/** Drifting slots on one division's board, for the studio warning. */
export function agendaDivisionHouseDrift(
  divisionId: string | undefined,
): { label: string; day: number; ourTime: string; houseTime: string }[] {
  if (!divisionId) return [];
  return agendaHouseSlotReports()
    .flatMap((r) => {
      const hit = r.drifting.find((d) => d.divisionId === divisionId);
      if (!hit || !r.houseTime) return [];
      return [{ label: r.label, day: r.day, ourTime: hit.time, houseTime: r.houseTime }];
    });
}
