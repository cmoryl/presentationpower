// -----------------------------------------------------------------------------
// NEXT 2026 San Francisco — default agenda boards.
//
// Only three San Francisco facts have been issued: the location line, the venue
// and the two dates. No programme, no rooms, no speakers. So these boards carry
// the approved agenda geometry and the shared house times the London
// programmes actually kept, and every content slot prints "TO BE CONFIRMED"
// rather than a session nobody has sent.
//
// The point is that a division can pick its board up today, see the right
// frame, dates and housekeeping, and type the programme in when it arrives —
// without anyone mistaking a placeholder row for an issued session.
//
// House times below are read off the issued London programmes (registration
// window, welcome, break, lunch, reception, close). They are carried, not
// measured against a San Francisco run of show, and the footnote says so.
// -----------------------------------------------------------------------------

import type { LondonAgendaProgramme } from "./next-agenda-london-2026";
import type { AgendaSession } from "./next-agenda";
import { SF_VENUE } from "./next-sf-event";

export const SF_DAY_ONE_META = "TUESDAY, OCTOBER 27, 2026";
export const SF_DAY_TWO_META = "WEDNESDAY, OCTOBER 28, 2026";
export const SF_FOOTER_RIGHT = "27 & 28 OCTOBER, 2026";

/** Printed in every content slot until a programme is issued. */
export const SF_TBC_TITLE = "TO BE CONFIRMED";

const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

/** A content slot with no issued session: honest placeholder, never a guess. */
const tbc = (time: string): AgendaSession =>
  row(time, SF_TBC_TITLE, "Session not yet issued", { muted: true });

/** Day one, on the London house times. */
const SF_DAY_ONE: AgendaSession[] = [
  row("11:30 AM-1:30 PM", "Registration & Networking", "", { muted: true }),
  tbc("1:30-1:45 PM"),
  tbc("1:45-2:30 PM"),
  tbc("2:30-3:15 PM"),
  row("3:15-3:30 PM", "BREAK", "", { muted: true }),
  tbc("3:30-4:15 PM"),
  tbc("4:15-5:00 PM"),
  tbc("5:00-5:45 PM"),
  row("6:00 PM", "Post-event Cocktail Reception", "", { muted: true }),
];

/** Day two, on the London house times. */
const SF_DAY_TWO: AgendaSession[] = [
  row("9:00-9:45 AM", "Doors Open, Coffee & Networking", "", { muted: true }),
  tbc("9:45-10:30 AM"),
  tbc("10:30-11:45 AM"),
  row("11:45 AM-12:45 PM", "Lunch", "", { muted: true }),
  tbc("12:45-1:30 PM"),
  tbc("1:30-2:15 PM"),
  tbc("2:15-2:45 PM"),
  row("2:55 PM", "Event Close & Takedown", "", { muted: true }),
];

const SF_FOOTNOTE =
  "Default board · no San Francisco programme has been issued. Times carried from the flagship house times; rooms and sessions to be confirmed.";

/**
 * The default San Francisco board for any division area.
 *
 * Deliberately identical for every division: nothing division-specific has
 * been issued for San Francisco, so a per-division difference here could only
 * be invented.
 */
export function sfProgramme(_divisionId?: string): LondonAgendaProgramme {
  return {
    title: "",
    meta: SF_DAY_ONE_META,
    rowStyle: "card",
    bandTreatment: "lavender",
    eyebrow: "",
    // No room has been issued for the InterContinental, so the room line
    // carries the issued location instead of a guessed space.
    locationLine: SF_VENUE.venue.toUpperCase(),
    footnote: SF_FOOTNOTE,
    footerLeft: "WWW.TRANSPERFECTNEXT.COM",
    footerRight: SF_FOOTER_RIGHT,
    sessions: SF_DAY_ONE,
    days: [
      { label: "", meta: SF_DAY_ONE_META, sessions: SF_DAY_ONE },
      { label: "", meta: SF_DAY_TWO_META, sessions: SF_DAY_TWO },
    ],
  };
}

export const SF_AGENDA_EDITION = "san-francisco";
