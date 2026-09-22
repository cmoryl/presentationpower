// TransPerfect NEXT 2026 — San Francisco edition.
//
// Single source for every San Francisco fact. Nothing else in the app may
// hardcode the city, venue, dates or the printed line: signs, decks, badges,
// QR captions and page copy all read from here, exactly as issued.
//
// ISSUED (27 September 2026 briefing):
//   SAN FRANCISCO | OCTOBER 27-28, 2026
//   INTERCONTINENTAL SAN FRANCISCO
//
// NOT issued yet — do not invent any of it: street address, floor plan, room
// list, agenda, capacities, production partner, sign schedule quantities.

import { NEXT_APP_ORIGIN } from "./next-event";

export const SF_VENUE = {
  id: "next-2026-san-francisco",
  eventId: "next-2026",
  name: "TransPerfect NEXT 2026 — San Francisco",
  /** Venue exactly as issued. */
  venue: "InterContinental San Francisco",
  city: "San Francisco, CA",
  startDate: "2026-10-27",
  endDate: "2026-10-28",
  /** The printed date line, as issued. */
  datesLabel: "October 27–28, 2026",
  /** The full issued location line, for signs and covers. */
  locationLine: "SAN FRANCISCO | OCTOBER 27-28, 2026",
  colourSpace: "Untagged 8-bit RGB (effectively sRGB)",
} as const;

/** Canonical live page for the San Francisco edition. */
export const SF_EVENT_URL = `${NEXT_APP_ORIGIN}/events/next/san-francisco`;

/** The issued location + venue line, stacked the way the covers set it. */
export function sfLocationStack(): [string, string] {
  return [SF_VENUE.locationLine, SF_VENUE.venue.toUpperCase()];
}

export type SfReadiness = {
  id: string;
  label: string;
  detail: string;
  /** "ready" = built and usable now. "waiting" = blocked on issued facts. */
  state: "ready" | "waiting";
  /** Route to open when it is ready. */
  to?: string;
  /** What we are waiting for, in the requester's words. */
  blockedOn?: string;
};

/**
 * What the San Francisco job can produce today, and what is still waiting on
 * facts nobody has issued. Anything "waiting" must stay waiting — the London
 * numbers are not a stand-in for a venue we have not surveyed.
 */
export const SF_READINESS: SfReadiness[] = [
  {
    id: "kiosks",
    label: "Partner kiosks",
    detail:
      "All 15 partner stands re-laid on the supplied TV kiosk template — 45 × 96 in front face with the monitor keep-clear plus both 4 × 96 in returns. Editable copy, live Illustrator and print-PDF downloads.",
    state: "ready",
    to: "/events/next/california",
  },
  {
    id: "badges",
    label: "Name badges",
    detail:
      "The badge family carries straight over: the city line and date line below read from this page, so every badge prints the San Francisco line.",
    state: "ready",
    to: "/events/next/badges",
  },
  {
    id: "pillars",
    label: "Pillars and signage faces",
    detail:
      "Welcome, registration, logo and directional pillars on the approved faces, with the San Francisco location line in place of London's.",
    state: "ready",
    to: "/events/next/pillars",
  },
  {
    id: "schedule",
    label: "Sign schedule",
    detail:
      "Describe the venue in a few numbers — floors, session rooms, entrances, desks, partner stands — and the schedule builds itself from the proven families with every size labelled as carried, not measured.",
    state: "ready",
    to: "/events/next/city",
  },
  {
    id: "agenda",
    label: "Agenda board",
    detail:
      "The agenda board prints the programme exactly as issued. No San Francisco programme has been sent, so there is nothing to set.",
    state: "waiting",
    blockedOn: "the two-day programme: session titles, times, rooms and speakers",
  },
  {
    id: "floorplan",
    label: "Venue plans and room directory",
    detail:
      "Floor plans, room names and capacities are traced from the venue's own sheets. None have been issued for the InterContinental.",
    state: "waiting",
    blockedOn: "the hotel's floor sheets and the room list with capacities",
  },
  {
    id: "survey",
    label: "Scenic panel kit",
    detail:
      "The scenic panels are cut to measured faces. Until a survey is issued we cannot state a single trim size for this venue.",
    state: "waiting",
    blockedOn: "a site survey with measured faces, and the production partner",
  },
];

export const SF_READY = SF_READINESS.filter((r) => r.state === "ready");
export const SF_WAITING = SF_READINESS.filter((r) => r.state === "waiting");
