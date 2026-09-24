/**
 * Edition division section — sits directly below the venue overview on a
 * location edition page. Rectangular tiles (lockup, accent bar, asset count),
 * never pill navigation. Picking a tile focuses the page on that division's
 * assets for this edition; picking it again (or "All divisions") clears it.
 *
 * Counts are only what the edition actually holds: an edition with no issued
 * signage shows 0 rather than borrowing another city's numbers.
 */

import { Link } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, Presentation, Signpost, X } from "lucide-react";

import { NEXT_DIVISIONS, type NextDivision } from "@/lib/next-event";
import { AGENDA_DIVISIONS } from "@/lib/next-agenda";
import { divisionSigns } from "@/lib/next-division-signage";
import { DivisionSignageKit } from "@/components/events/DivisionSignageKit";

export type EditionDivisionCounts = {
  booths: number;
  signage: number;
  agendas: number;
  collateral: number;
};

export type EditionDivisionTilesProps = {
  /** Edition label for headings, e.g. "London 2026". */
  editionLabel: string;
  /** Edition id ("london", "san-francisco") so studio links save to this city. */
  editionId?: string;
  /** Per-division booth / room-signage counts from this edition's schedule. */
  countsFor: (divisionId: string) => { booths: number; signage: number };
  /** True when the edition has an issued programme, so agenda boards exist. */
  hasProgramme: boolean;
  selected: string | null;
  onSelect: (divisionId: string | null) => void;
  /** Where the filtered booth/signage list lives, for the focus summary link. */
  assetsAnchor?: string;
  /** False when no sign schedule has been issued: tiles say so instead of showing 0. */
  signageIssued?: boolean;
};

export function editionDivisionCounts(
  division: NextDivision,
  base: { booths: number; signage: number },
  hasProgramme: boolean,
): EditionDivisionCounts {
  return {
    ...base,
    agendas: hasProgramme && AGENDA_DIVISIONS.some((d) => d.id === division.id) ? 1 : 0,
    collateral: divisionSigns(division.id).length,
  };
}

export function EditionDivisionTiles({
  editionId,
  editionLabel,
  countsFor,
  hasProgramme,
  selected,
  onSelect,
  assetsAnchor,
  signageIssued = true,
}: EditionDivisionTilesProps) {
  const focus = NEXT_DIVISIONS.find((d) => d.id === selected) ?? null;
  const focusCounts = focus
    ? editionDivisionCounts(focus, countsFor(focus.id), hasProgramme)
    : null;

  return (
    <section className="mt-10" aria-labelledby="edition-divisions">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#03002C]/60">
            {editionLabel}
          </p>
          <h2 id="edition-divisions" className="mt-1 text-lg font-semibold text-[#03002C]">
            Divisions at this edition
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[#03002C]/65">
            Pick a division to see only its booths, room signage, track agenda and collateral for
            this event.
          </p>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#03002C]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
          >
            <X className="h-3.5 w-3.5" /> All divisions
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Filter this edition by division"
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {NEXT_DIVISIONS.map((d) => {
          const c = editionDivisionCounts(d, countsFor(d.id), hasProgramme);
          const total = c.booths + c.signage + c.agendas + c.collateral;
          const active = selected === d.id;
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : d.id)}
              className={`group flex flex-col overflow-hidden rounded-md border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] focus-visible:ring-offset-2 ${
                active
                  ? "border-[#03002C] shadow-[0_10px_24px_-18px_rgba(3,0,44,0.6)]"
                  : selected
                    ? "border-black/10 opacity-60 hover:opacity-100"
                    : "border-black/10 hover:border-[#03002C]/40"
              }`}
            >
              <span className="block h-1.5 w-full" style={{ background: d.accent }} aria-hidden />
              <span className="flex h-16 items-center justify-center px-4">
                <img
                  src={d.lockup.horizontal}
                  alt={`${d.eventName} lockup`}
                  loading="lazy"
                  className="max-h-8 max-w-full object-contain"
                />
              </span>
              <span className="flex items-baseline justify-between gap-2 border-t border-black/10 px-3 py-2">
                <span className="truncate text-[12.5px] font-semibold text-[#03002C]">
                  {d.name}
                </span>
                {signageIssued ? (
                  <span className="shrink-0 font-mono text-[11px] text-[#03002C]/70">
                    {total} {total === 1 ? "asset" : "assets"}
                  </span>
                ) : null}
              </span>
              {!signageIssued ? (
                <span className="border-t border-black/10 px-3 py-1.5 text-[11px] text-[#03002C]/70">
                  Signage programme not yet issued
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {focus && focusCounts ? (
        <div className="mt-5 overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="h-1" style={{ background: focus.accent }} aria-hidden />
          <div className="p-5">
            <h3 className="text-base font-semibold text-[#03002C]">
              {focus.eventName} · {editionLabel}
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: "Booths", v: focusCounts.booths, icon: LayoutGrid },
                { k: "Room signage", v: focusCounts.signage, icon: Signpost },
                { k: "Track agenda", v: focusCounts.agendas, icon: CalendarDays },
                { k: "Collateral kit", v: focusCounts.collateral, icon: Presentation },
              ]
                .filter((x) => signageIssued || (x.k !== "Booths" && x.k !== "Room signage"))
                .map(({ k, v, icon: Icon }) => (
                  <div key={k} className="rounded-md border border-black/10 p-3">
                    <dt className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/60">
                      <Icon className="h-3.5 w-3.5" aria-hidden /> {k}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold text-[#03002C]">{v}</dd>
                  </div>
                ))}
            </dl>
            {!signageIssued ? (
              <p className="mt-3 text-[13px] text-[#03002C]/70">
                Booths and room signage appear here once this edition's signage programme is issued.
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold">
              {assetsAnchor && focusCounts.booths + focusCounts.signage > 0 ? (
                <a href={`#${assetsAnchor}`} className="text-[#003FC7] hover:underline">
                  See its booths and signage below
                </a>
              ) : null}
              {focusCounts.agendas > 0 ? (
                <Link
                  to="/events/next/agendas"
                  search={{ division: focus.id, edition: editionId }}
                  className="text-[#003FC7] hover:underline"
                >
                  Open its track agenda
                </Link>
              ) : (
                <span className="font-normal text-[#03002C]/60">
                  No track agenda yet — waiting on the issued programme.
                </span>
              )}
              <Link
                to="/events/next/divisions/$divisionId"
                params={{ divisionId: focus.id }}
                className="text-[#003FC7] hover:underline"
              >
                Division page
              </Link>
            </div>
            {focusCounts.collateral > 0 ? (
              <div className="mt-6 border-t border-black/10 pt-5">
                <h4 className="text-sm font-semibold text-[#03002C]">Collateral kit</h4>
                <div className="mt-3">
                  <DivisionSignageKit divisionId={focus.id} compact />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
