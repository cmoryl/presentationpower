// City-specific template section for /events/next/city.
//
// Each city edition builds its own room, schedule and panel masters. Saved
// pillars and agendas are scoped by edition_id, so London can build and save
// its own masters while San Francisco's venue intake is still open — nothing
// London saves ever replaces the shared defaults San Francisco starts from.

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, Columns3, LayoutGrid, Lock, Map as MapIcon } from "lucide-react";

import {
  pickAgendaFile,
  pickPillarFile,
  useSavedAgendaFiles,
  useSavedPillarFiles,
} from "@/hooks/use-next-live-masters";
import { AGENDA_DIVISIONS } from "@/lib/next-agenda";
import { PILLAR_KINDS } from "@/lib/next-pillar-masters";

type CityEdition = {
  id: string;
  label: string;
  /** Venue intake locked: rooms and programme issued, so room/schedule masters can be built. */
  intakeLocked: boolean;
  status: string;
};

const CITY_EDITIONS: CityEdition[] = [
  { id: "london", label: "London", intakeLocked: true, status: "Venue intake locked" },
  {
    id: "san-francisco",
    label: "San Francisco",
    intakeLocked: false,
    status: "Pending venue intake",
  },
];

function StatusLabel({ saved }: { saved: boolean }) {
  return (
    <span
      className={`inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
        saved ? "bg-[#003FC7] text-white" : "bg-[#F2F2F2] text-[#03002C]/70"
      }`}
    >
      {saved ? "Saved for this city" : "Shared default"}
    </span>
  );
}

export function CityTemplateSection() {
  const [editionId, setEditionId] = useState("london");
  const [divisionId, setDivisionId] = useState(AGENDA_DIVISIONS[0]?.id ?? "transperfect");
  const edition = CITY_EDITIONS.find((e) => e.id === editionId) ?? CITY_EDITIONS[0];
  const pillars = useSavedPillarFiles();
  const agendas = useSavedAgendaFiles();
  const agendaFile = pickAgendaFile(agendas.data, divisionId, edition.id);

  return (
    <section aria-labelledby="city-templates" className="mt-12 border-t border-black/10 pt-8">
      <h2 id="city-templates" className="text-xl font-semibold text-[#03002C]">
        City templates
      </h2>
      <p className="mt-1.5 max-w-3xl text-[14px] leading-[1.5] text-black/70">
        Each city builds its own room, schedule and panel masters. Files saved here belong to the
        chosen city only — other cities keep starting from the shared division defaults.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-6">
        <div role="group" aria-label="City edition" className="flex border-b border-black/10">
          {CITY_EDITIONS.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={e.id === edition.id}
              onClick={() => setEditionId(e.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/40 ${
                e.id === edition.id
                  ? "border-[#003FC7] text-[#03002C]"
                  : "border-transparent text-black/55 hover:text-[#03002C]"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-[11px] font-medium text-black/60">Division</span>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="mt-1 block rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
          >
            {AGENDA_DIVISIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-black/55">
          {edition.status}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Rooms */}
        <article className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#03002C]">
            <MapIcon size={14} /> Room masters
          </div>
          {edition.intakeLocked ? (
            <>
              <p className="mt-2 text-[13px] leading-[1.5] text-black/70">
                Floor maps, room colours and room logos built from the issued venue sheets.
              </p>
              <Link
                to="/events/next/london/maps"
                className="mt-3 inline-flex text-[13px] font-medium text-[#003FC7] hover:underline"
              >
                Edit {edition.label} rooms
              </Link>
            </>
          ) : (
            <p className="mt-2 flex gap-1.5 text-[13px] leading-[1.5] text-black/70">
              <Lock size={13} className="mt-0.5 shrink-0" /> Opens once the venue floor sheets and
              room list are issued. No rooms are drawn from guesses.
            </p>
          )}
        </article>

        {/* Schedule */}
        <article className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#03002C]">
            <LayoutGrid size={14} /> Schedule masters
          </div>
          {edition.intakeLocked ? (
            <>
              <p className="mt-2 text-[13px] leading-[1.5] text-black/70">
                Room-linked schedule from the issued programme.
              </p>
              <Link
                to="/events/next/london/schedule"
                className="mt-3 inline-flex text-[13px] font-medium text-[#003FC7] hover:underline"
              >
                Edit {edition.label} schedule
              </Link>
            </>
          ) : (
            <p className="mt-2 flex gap-1.5 text-[13px] leading-[1.5] text-black/70">
              <Lock size={13} className="mt-0.5 shrink-0" /> Opens once the programme is issued.
            </p>
          )}
          <div className="mt-4 border-t border-black/8 pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[12.5px] text-[#03002C]">
                <CalendarDays size={13} /> Agenda board
              </span>
              <StatusLabel saved={Boolean(agendaFile)} />
            </div>
            <Link
              to="/events/next/agendas"
              search={{ division: divisionId, file: agendaFile?.id, edition: edition.id }}
              className="mt-2 inline-flex text-[12.5px] font-medium text-[#003FC7] hover:underline"
            >
              {agendaFile ? "Edit this city's agenda" : `Build ${edition.label} agenda`}
            </Link>
          </div>
        </article>

        {/* Panels */}
        <article className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#03002C]">
            <Columns3 size={14} /> Panel masters
          </div>
          <ul className="mt-3 divide-y divide-black/8">
            {PILLAR_KINDS.map((k) => {
              const file =
                pickPillarFile(pillars.data, divisionId, k.id, "light", edition.id) ??
                pickPillarFile(pillars.data, divisionId, k.id, "dark", edition.id);
              return (
                <li key={k.id} className="flex items-center justify-between gap-2 py-2">
                  <Link
                    to="/events/next/pillars"
                    search={{
                      division: divisionId,
                      kind: k.id,
                      face: file?.config.face,
                      file: file?.id,
                      edition: edition.id,
                    }}
                    className="text-[12.5px] font-medium text-[#003FC7] hover:underline"
                  >
                    {k.name}
                  </Link>
                  <StatusLabel saved={Boolean(file)} />
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
