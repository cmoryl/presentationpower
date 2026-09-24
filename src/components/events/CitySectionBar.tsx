// The same "On this page" order for every NEXT city edition, so moving between
// London and San Francisco never feels like two different apps. Sections a city
// can't have yet show "Pending venue intake" rather than disappearing.

import { Link } from "@tanstack/react-router";

type Target =
  | { kind: "anchor"; id: string }
  | { kind: "page"; to: "/events/next/london/maps" | "/events/next/london/schedule" | "/events/next/california" }
  | { kind: "pending" };

export type CitySection = { label: string; target: Target };

export const CITY_SECTION_ORDER = [
  "Overview",
  "Divisions",
  "Rooms & maps",
  "Schedule & agendas",
  "Signage & panels",
  "Downloads",
  "Reference",
] as const;

export const LONDON_SECTIONS: CitySection[] = [
  { label: "Overview", target: { kind: "anchor", id: "city-overview" } },
  { label: "Divisions", target: { kind: "anchor", id: "edition-divisions" } },
  { label: "Rooms & maps", target: { kind: "page", to: "/events/next/london/maps" } },
  { label: "Schedule & agendas", target: { kind: "anchor", id: "london-agendas" } },
  { label: "Signage & panels", target: { kind: "anchor", id: "london-panels" } },
  { label: "Downloads", target: { kind: "anchor", id: "city-overview" } },
  { label: "Reference", target: { kind: "anchor", id: "london-reference" } },
];

export const SAN_FRANCISCO_SECTIONS: CitySection[] = [
  { label: "Overview", target: { kind: "anchor", id: "sf-gates" } },
  { label: "Divisions", target: { kind: "anchor", id: "edition-divisions" } },
  { label: "Rooms & maps", target: { kind: "pending" } },
  { label: "Schedule & agendas", target: { kind: "pending" } },
  { label: "Signage & panels", target: { kind: "anchor", id: "sf-kiosks" } },
  { label: "Downloads", target: { kind: "anchor", id: "sf-kiosks" } },
  { label: "Reference", target: { kind: "anchor", id: "sf-ready" } },
];

export function CitySectionBar({ sections }: { sections: CitySection[] }) {
  const cls =
    "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-1 pb-2 pt-1 text-[13px] font-medium text-[#03002C]/75 hover:border-[#003FC7] hover:text-[#03002C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]";
  return (
    <nav
      aria-label="On this page"
      className="mt-6 flex flex-nowrap items-end gap-x-5 overflow-x-auto border-b border-black/10 [scrollbar-width:none]"
    >
      <span className="shrink-0 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60">
        On this page
      </span>
      {sections.map((s) =>
        s.target.kind === "anchor" ? (
          <a key={s.label} href={`#${s.target.id}`} className={cls}>
            {s.label}
          </a>
        ) : s.target.kind === "page" ? (
          <Link key={s.label} to={s.target.to} className={cls}>
            {s.label} <span aria-hidden>→</span>
          </Link>
        ) : (
          <span
            key={s.label}
            className="inline-flex items-center gap-1.5 whitespace-nowrap px-1 pb-2 pt-1 text-[13px] text-[#03002C]/50"
          >
            {s.label}
            <span className="font-mono text-[10px] uppercase tracking-[0.1em]">Pending venue intake</span>
          </span>
        ),
      )}
    </nav>
  );
}
