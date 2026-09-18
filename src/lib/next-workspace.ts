/**
 * The NEXT workspace map — ONE registry of every page in the NEXT event build.
 *
 * Before this existed, the 26 NEXT pages were only discoverable through
 * whichever hub tile happened to link them, so finding "the page that makes
 * badges" meant guessing. Every NEXT surface now reads this file: the shared
 * sub-navigation (`NextSubnav`) and the hub directory. Add a NEXT page here in
 * the same change that creates its route, or it stays invisible.
 */

export type NextWorkspaceGroupId =
  | "plan"
  | "programme"
  | "signage"
  | "london"
  | "reference";

/** Which cities a page applies to — the second thing people get wrong. */
export type NextWorkspaceScope = "every-city" | "london";

export type NextWorkspacePath =
  | "/events/next"
  | "/events/next/locations"
  | "/events/next/venues"
  | "/events/next/venue"
  | "/events/next/city"
  | "/events/next/playbook"
  | "/events/next/knowledge"
  | "/events/next/agendas"
  | "/events/next/guide"
  | "/events/next/city-series"
  | "/events/next/pillars"
  | "/events/next/mart"
  | "/events/next/badges"
  | "/events/next/city-badges"
  | "/events/next/london"
  | "/events/next/london/maps"
  | "/events/next/london/template"
  | "/events/next/london/revise"
  | "/events/next/london/booklet"
  | "/knowledge/brand-guides/next-2026"
  | "/knowledge/brand-guides/next-2026-build"
  | "/decks/next-palette";

export type NextWorkspacePage = {
  to: NextWorkspacePath;
  /** Short label for navigation pills. */
  label: string;
  /** One line, plain language: what you do on this page. */
  purpose: string;
  group: NextWorkspaceGroupId;
  scope: NextWorkspaceScope;
  /** Shown in the hub directory only; keeps the pill row short. */
  detail?: string;
};

export const NEXT_WORKSPACE_GROUPS: Array<{
  id: NextWorkspaceGroupId;
  label: string;
  blurb: string;
}> = [
  {
    id: "plan",
    label: "Plan the event",
    blurb: "Venue facts, floor plans and the sign schedule a city starts from.",
  },
  {
    id: "programme",
    label: "Programme & delegate print",
    blurb: "Agendas, the delegate guide and the client-facing booklet.",
  },
  {
    id: "signage",
    label: "Signage & identity",
    blurb: "Pillars, MART, badges — the reusable families every city gets.",
  },
  {
    id: "london",
    label: "London 2026 (job 2281)",
    blurb: "The live QEII Centre job: panel kit, install maps, revisions.",
  },
  {
    id: "reference",
    label: "Reference",
    blurb: "Approved brand guide, build reference and the palette deck.",
  },
];

export const NEXT_WORKSPACE_PAGES: NextWorkspacePage[] = [
  {
    to: "/events/next",
    label: "NEXT home",
    purpose: "Every NEXT design in one index, by division and format.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/locations",
    label: "Venue pages",
    purpose: "The editable record per location: address, map, opening times, photo.",
    group: "plan",
    scope: "every-city",
    detail: "The delegate guide and practical pages read this record.",
  },
  {
    to: "/events/next/venues",
    label: "Venue plans",
    purpose: "One floor-plan format for every city.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/venue",
    label: "Next venue",
    purpose: "Provisional plans and reissued signage for a venue not yet confirmed.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/city",
    label: "Start a city",
    purpose: "Build a new city's sign schedule from the London families.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/playbook",
    label: "Venue playbook",
    purpose: "The reusable signage families and how many of each a venue needs.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/knowledge",
    label: "Event knowledge",
    purpose: "Ask what previous venues taught us before you commit.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/agendas",
    label: "Agenda boards",
    purpose: "The printed agenda board per division, on the approved programme.",
    group: "programme",
    scope: "every-city",
  },
  {
    to: "/events/next/guide",
    label: "Delegate guide",
    purpose: "The per-location delegate booklet — PDF, Word and PowerPoint.",
    group: "programme",
    scope: "every-city",
  },
  {
    to: "/events/next/city-series",
    label: "City Series kit",
    purpose: "The roadshow kit: agenda board plus light pillars.",
    group: "programme",
    scope: "every-city",
  },
  {
    to: "/events/next/london/booklet",
    label: "London booklet",
    purpose: "The client-facing booklet built from the London agenda boards.",
    group: "programme",
    scope: "london",
  },
  {
    to: "/events/next/pillars",
    label: "Pillar signs",
    purpose: "Welcome, registration, logo and directional pillars.",
    group: "signage",
    scope: "every-city",
  },
  {
    to: "/events/next/mart",
    label: "MART signage",
    purpose: "The MART run: stop signs, fascia and retail panels.",
    group: "signage",
    scope: "every-city",
  },
  {
    to: "/events/next/badges",
    label: "Badges",
    purpose: "One attendee badge template, every division.",
    group: "signage",
    scope: "every-city",
  },
  {
    to: "/events/next/city-badges",
    label: "Badge studio",
    purpose: "Edit and print a city's badge run.",
    group: "signage",
    scope: "every-city",
  },
  {
    to: "/events/next/london",
    label: "London kit",
    purpose: "The QEII Centre panel kit — every print area and its live file.",
    group: "london",
    scope: "london",
  },
  {
    to: "/events/next/london/maps",
    label: "Install maps",
    purpose: "Floor plans marking where each panel is installed.",
    group: "london",
    scope: "london",
  },
  {
    to: "/events/next/london/template",
    label: "Signage template",
    purpose: "The signage template creator on the approved CMYK grounds.",
    group: "london",
    scope: "london",
  },
  {
    to: "/events/next/london/revise",
    label: "Revisions",
    purpose: "Publish a signage revision the print vendor sees as in force.",
    group: "london",
    scope: "london",
  },
  {
    to: "/knowledge/brand-guides/next-2026",
    label: "Brand guide",
    purpose: "The approved NEXT 2026 master brand guide.",
    group: "reference",
    scope: "every-city",
  },
  {
    to: "/knowledge/brand-guides/next-2026-build",
    label: "Build reference",
    purpose: "Formats, ids and the decisions behind them.",
    group: "reference",
    scope: "every-city",
  },
  {
    to: "/decks/next-palette",
    label: "Palette deck",
    purpose: "The NEXT palette as a presentable deck.",
    group: "reference",
    scope: "every-city",
  },
];

export const NEXT_WORKSPACE_BY_PATH: Record<string, NextWorkspacePage> = Object.fromEntries(
  NEXT_WORKSPACE_PAGES.map((p) => [p.to, p]),
);

export function nextWorkspaceGroup(id: NextWorkspaceGroupId): NextWorkspacePage[] {
  return NEXT_WORKSPACE_PAGES.filter((p) => p.group === id);
}

/**
 * The registry entry for a pathname — longest match wins so
 * `/events/next/london/maps` resolves to the maps page, not the London kit.
 */
export function nextWorkspacePageFor(pathname: string): NextWorkspacePage | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  let best: NextWorkspacePage | null = null;
  for (const page of NEXT_WORKSPACE_PAGES) {
    if (clean === page.to || clean.startsWith(page.to + "/")) {
      if (!best || page.to.length > best.to.length) best = page;
    }
  }
  return best;
}

/** True for any pathname that belongs to the NEXT workspace. */
export function isNextWorkspacePath(pathname: string): boolean {
  return pathname === "/events/next" || pathname.startsWith("/events/next/");
}
