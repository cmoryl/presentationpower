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
  | "san-francisco"
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
  | "/events/next/san-francisco"
  | "/events/next/california"
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
  /**
   * Pages folded into another menu item: the tab row shows only the parent,
   * and it stays underlined while you are on this page. Each page still has
   * its own address so old links keep working.
   */
  navAs?: NextWorkspacePath;
};

export const NEXT_WORKSPACE_GROUPS: Array<{
  id: NextWorkspaceGroupId;
  label: string;
  blurb: string;
}> = [
  {
    id: "plan",
    label: "Plan the event",
    blurb: "Start a city, keep venue records and floor-plan standards, and learn from past venues.",
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
    id: "san-francisco",
    label: "San Francisco 2026",
    blurb: "InterContinental San Francisco: stage gates and the California partner kiosks.",
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
    to: "/events/next/city",
    label: "Plan a new city",
    purpose: "The guided start for a city: venue record, floor plans, sign schedule, city templates.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/locations",
    label: "Venues & floor-plan standards",
    purpose: "The editable record per location and the one floor-plan format every city uses.",
    group: "plan",
    scope: "every-city",
    detail: "The delegate guide and practical pages read this record.",
  },
  {
    to: "/events/next/venues",
    label: "Floor-plan standards",
    purpose: "One floor-plan format for every city.",
    group: "plan",
    scope: "every-city",
    navAs: "/events/next/locations",
  },
  {
    to: "/events/next/venue",
    label: "Provisional floor plans",
    purpose: "Step 2 of planning a city: provisional plans until the venue is confirmed.",
    group: "plan",
    scope: "every-city",
    navAs: "/events/next/city",
  },
  {
    to: "/events/next/playbook",
    label: "Playbook & knowledge",
    purpose: "The reusable signage families, and what previous venues taught us.",
    group: "plan",
    scope: "every-city",
  },
  {
    to: "/events/next/knowledge",
    label: "Event knowledge & retro",
    purpose: "Ask what previous venues taught us before you commit.",
    group: "plan",
    scope: "every-city",
    navAs: "/events/next/playbook",
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
    label: "London 2026",
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
    to: "/events/next/san-francisco",
    label: "San Francisco 2026",
    purpose: "Stage gates, the partner kiosks and what waits on the venue intake.",
    group: "san-francisco",
    scope: "every-city",
  },
  {
    to: "/events/next/california",
    label: "California partner kiosks",
    purpose: "The 45 × 96 in partner kiosk templates with .ai, .pdf and .svg downloads.",
    group: "san-francisco",
    scope: "every-city",
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

/** The menu items for a group — pages folded into another item are left out. */
export function nextWorkspaceMenu(id: NextWorkspaceGroupId): NextWorkspacePage[] {
  return nextWorkspaceGroup(id).filter((p) => !p.navAs);
}

/** The menu item that stays underlined for a page (itself, or its parent). */
export function nextWorkspaceMenuPath(page: NextWorkspacePage | null): NextWorkspacePath | null {
  return page ? (page.navAs ?? page.to) : null;
}

/**
 * Breadcrumb trail for a NEXT page: Events / NEXT / group-or-city / page.
 * The NEXT hub itself stops at "NEXT".
 */
export function nextWorkspaceCrumbs(
  page: NextWorkspacePage | null,
): Array<{ label: string; to?: NextWorkspacePath | "/events" }> {
  const crumbs: Array<{ label: string; to?: NextWorkspacePath | "/events" }> = [
    { label: "Events", to: "/events" },
    { label: "NEXT", to: "/events/next" },
  ];
  if (!page || page.to === "/events/next") return crumbs;
  const group = NEXT_WORKSPACE_GROUPS.find((g) => g.id === page.group);
  const cityHome =
    page.group === "london" ? "/events/next/london" : page.group === "san-francisco" ? "/events/next/san-francisco" : null;
  if (cityHome && cityHome !== page.to) {
    crumbs.push({ label: NEXT_WORKSPACE_BY_PATH[cityHome]?.label ?? group?.label ?? "", to: cityHome });
  } else if (!cityHome && group) {
    crumbs.push({ label: group.label });
  }
  const parent = page.navAs ? NEXT_WORKSPACE_BY_PATH[page.navAs] : null;
  if (parent) crumbs.push({ label: parent.label, to: parent.to });
  crumbs.push({ label: page.label });
  return crumbs;
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
