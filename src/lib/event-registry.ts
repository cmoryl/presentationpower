// One registry of events, so every event — London, San Francisco and each one
// started from "Start a new event" — gets the same home page with the same tabs.
// Facts come only from NEXT_EVENT, SF_VENUE and the started event's own record;
// nothing here invents a room, date or venue.

import type { LinkOptions } from "@tanstack/react-router";
import { NEXT_EVENT } from "./next-event";
import { SF_READINESS, SF_VENUE } from "./next-sf-event";

export type EventTabId =
  | "checklist"
  | "maps"
  | "schedule"
  | "agendas"
  | "signage"
  | "badges"
  | "kiosks"
  | "mart"
  | "knowledge";

export const EVENT_TAB_ORDER: readonly EventTabId[] = [
  "checklist",
  "maps",
  "schedule",
  "agendas",
  "signage",
  "badges",
  "kiosks",
  "mart",
  "knowledge",
];

export const EVENT_TAB_LABEL: Record<EventTabId | "overview", string> = {
  overview: "Overview",
  checklist: "Checklist",
  maps: "Maps",
  schedule: "Schedule",
  agendas: "Agendas",
  signage: "Signage",
  badges: "Badges & pillars",
  kiosks: "Kiosks",
  mart: "Mart & price list",
  knowledge: "Knowledge",
};

export type EventTool = { label: string; detail: string; link: LinkOptions };

export type EventTab = {
  id: EventTabId;
  /** Tools this tab opens, already set to the event. */
  tools: EventTool[];
  /** When nothing can be built yet: what it waits on, in plain words. */
  waitingOn?: string;
};

export type ReadyItem = {
  label: string;
  state: "ready" | "waiting";
  detail?: string;
  blockedOn?: string;
  link?: LinkOptions;
};

export type EventEntry = {
  id: string;
  kind: "flagship" | "edition" | "started";
  name: string;
  venue: string;
  city: string;
  dates: string;
  tabs: EventTab[];
  /** Fixed readiness for built-in events; started events use their checklist. */
  readiness?: ReadyItem[];
};

/** Hub ids that would clash with fixed /events pages. */
export const RESERVED_EVENT_IDS = new Set([
  "next",
  "new",
  "demo",
  "pillars",
  "presets",
  "production",
  "venues",
]);

const knowledge: EventTab = {
  id: "knowledge",
  tools: [
    {
      label: "Event knowledge",
      detail: "What past events taught us — sign sizes, placements, lessons and decisions.",
      link: { to: "/events/next/knowledge" },
    },
  ],
};

function londonEntry(): EventEntry {
  const tabs: EventTab[] = [
    {
      id: "checklist",
      tools: [
        {
          label: "Venue pack in force",
          detail: "The issued venue pack and every published signage revision.",
          link: { to: "/events/next/london/revise" },
        },
      ],
    },
    {
      id: "maps",
      tools: [
        {
          label: "QEII venue maps",
          detail: "Every floor, Find your way page, room colours, logos and all downloads.",
          link: { to: "/events/next/london/maps" },
        },
      ],
    },
    {
      id: "schedule",
      tools: [
        {
          label: "Room schedule",
          detail: "Each room's sessions by floor and day, linked to the map.",
          link: { to: "/events/next/london/schedule" },
        },
        {
          label: "Event booklet",
          detail: "The printed programme booklet.",
          link: { to: "/events/next/london/booklet" },
        },
      ],
    },
    {
      id: "agendas",
      tools: [
        {
          label: "Division agendas",
          detail: "Editable agenda boards, A4 to A1, every division.",
          link: { to: "/events/next/agendas" },
        },
      ],
    },
    {
      id: "signage",
      tools: [
        {
          label: "Scenic panel kit",
          detail: "Job 2281 — all 54 panels with trim, bleed and vector downloads.",
          link: { to: "/events/next/london" },
        },
        {
          label: "Signage template",
          detail: "The master signage template and faces.",
          link: { to: "/events/next/london/template" },
        },
        {
          label: "Publish a revision",
          detail: "Review changes and publish the next signage revision.",
          link: { to: "/events/next/london/revise" },
        },
      ],
    },
    {
      id: "badges",
      tools: [
        {
          label: "Name badges",
          detail: "Every division badge on the approved template.",
          link: { to: "/events/next/badges" },
        },
        {
          label: "Pillars",
          detail: "Welcome, registration, logo and directional pillars.",
          link: { to: "/events/next/pillars" },
        },
      ],
    },
    {
      id: "mart",
      tools: [
        {
          label: "NEXT Mart",
          detail: "Mart signage for each stop.",
          link: { to: "/events/next/mart" },
        },
        {
          label: "Price list sheet",
          detail: "A4 price list with editable prices and currency.",
          link: { to: "/events/next/mart/price-list" },
        },
      ],
    },
    knowledge,
  ];
  return {
    id: "london",
    kind: "flagship",
    name: `${NEXT_EVENT.name} — London`,
    venue: NEXT_EVENT.venue,
    city: NEXT_EVENT.city,
    dates: NEXT_EVENT.datesLabel,
    tabs,
    readiness: tabs.flatMap((t) =>
      t.id === "knowledge" ? [] : [{ label: t.tools[0].label, state: "ready" as const, link: t.tools[0].link }],
    ),
  };
}

function sfEntry(): EventEntry {
  const tool = (id: string): EventTool[] => {
    const r = SF_READINESS.find((x) => x.id === id);
    if (!r || r.state !== "ready" || !r.to) return [];
    return [
      {
        label: r.label,
        detail: r.detail,
        link: { to: r.to, search: r.search } as LinkOptions,
      },
    ];
  };
  const waiting = (id: string) => SF_READINESS.find((x) => x.id === id)?.blockedOn;
  return {
    id: "san-francisco",
    kind: "edition",
    name: SF_VENUE.name,
    venue: SF_VENUE.venue,
    city: SF_VENUE.city,
    dates: SF_VENUE.datesLabel,
    tabs: [
      { id: "maps", tools: [], waitingOn: waiting("floorplan") },
      { id: "schedule", tools: [], waitingOn: "the issued programme with rooms and times" },
      { id: "agendas", tools: tool("agenda") },
      { id: "signage", tools: tool("schedule"), waitingOn: waiting("survey") },
      { id: "badges", tools: [...tool("badges"), ...tool("pillars")] },
      { id: "kiosks", tools: tool("kiosks") },
      knowledge,
    ],
    readiness: SF_READINESS.map((r) => ({
      label: r.label,
      state: r.state,
      detail: r.detail,
      blockedOn: r.blockedOn,
      link: r.to ? ({ to: r.to, search: r.search } as LinkOptions) : undefined,
    })),
  };
}

export type StartedEventRow = {
  event_id: string;
  name: string;
  city: string | null;
  venue: string | null;
  dates_label: string | null;
};

export function startedEntry(row: StartedEventRow): EventEntry {
  const id = row.event_id;
  return {
    id,
    kind: "started",
    name: row.name,
    venue: row.venue ?? "",
    city: row.city ?? "",
    dates: row.dates_label ?? "",
    tabs: [
      {
        id: "checklist",
        tools: [
          {
            label: "Venue checklist and research",
            detail: "What the venue and organisers still need to send, and what the web search found.",
            link: { to: "/events/next/intake/$eventId", params: { eventId: id } },
          },
        ],
      },
      {
        id: "maps",
        tools: [
          {
            label: "Venue maps",
            detail: "Load each floor's plan as SVG, colour rooms and download.",
            link: { to: "/events/next/maps/$eventId", params: { eventId: id } },
          },
        ],
      },
      { id: "schedule", tools: [], waitingOn: "the issued programme with rooms and times" },
      {
        id: "agendas",
        tools: [
          {
            label: "Division agendas",
            detail: "Default boards; every session prints TO BE CONFIRMED until the programme is issued.",
            link: { to: "/events/next/agendas" },
          },
        ],
      },
      {
        id: "signage",
        tools: [
          {
            label: "Sign schedule",
            detail: "Build a starting sign list from a few venue numbers; sizes are carried, not measured.",
            link: { to: "/events/next/city" },
          },
        ],
      },
      {
        id: "badges",
        tools: [
          { label: "Name badges", detail: "The approved badge family.", link: { to: "/events/next/badges" } },
          { label: "Pillars", detail: "The approved pillar faces.", link: { to: "/events/next/pillars" } },
        ],
      },
      knowledge,
    ],
  };
}

export const BUILT_IN_EVENTS: readonly EventEntry[] = [londonEntry(), sfEntry()];

export function builtInEvent(id: string): EventEntry | undefined {
  return BUILT_IN_EVENTS.find((e) => e.id === id);
}

/** Share of readiness items that are ready. */
export function readinessProgress(items: readonly ReadyItem[]): { ready: number; total: number } {
  return { ready: items.filter((i) => i.state === "ready").length, total: items.length };
}
