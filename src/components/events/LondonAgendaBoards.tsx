// London kit — division agenda boards.
//
// Every NEXT division gets an agenda board card for the London run: the saved
// live file when one exists, otherwise the editable division default. Opens the
// same agenda studio the hub uses, so an edit here is the same live file.

import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useMemo } from "react";

import { AgendaSheet } from "@/components/next/AgendaSheet";
import { pickAgendaFile, useSavedAgendaFiles } from "@/hooks/use-next-live-masters";
import {
  AGENDA_DIVISIONS,
  agendaDays,
  agendaDefault,
  agendaLocationText,
  agendaPages,
  agendaFileIsLive,
  type AgendaConfig,
} from "@/lib/next-agenda";
import type { AgendaFileRecord } from "@/hooks/use-next-live-masters";

function AgendaCard({
  id,
  name,
  saved,
}: {
  id: string;
  name: string;
  saved: AgendaFileRecord | undefined;
}) {
  // A file saved off an unrelated older programme is not a live board. An
  // edited board is: it stays on the card and behind the edit link.
  const live = useMemo(
    () => (saved && agendaFileIsLive(saved.config) ? saved : undefined),
    [saved],
  );
  const config: AgendaConfig = useMemo(() => (live ? live.config : agendaDefault(id)), [live, id]);

  // Render the card from the board's first printed page, exactly as it comes off
  // the press: when the programme holds on one sheet that is the merged
  // multi-day board, otherwise it is day one, page one.
  const pages = useMemo(() => agendaPages(config), [config]);
  const first = pages[0]?.config ?? config;
  const dayCount = agendaDays(config).length;
  const room = agendaLocationText(config).trim();
  const sessionCount = agendaDays(config).reduce((n, d) => n + (d.sessions?.length ?? 0), 0);

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-black/10 bg-white">
      <div className="flex justify-center bg-[#F2F2F2] p-3">
        <AgendaSheet config={first} pxPerMm={0.2} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
          {live ? "Live board" : "Editable master"}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#03002C]">{name}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#03002C]/65">
          {config.trimW}×{config.trimH} mm · {config.face} face ·{" "}
          {pages.length === 1
            ? dayCount > 1
              ? `all ${dayCount} days on one sheet`
              : "one sheet"
            : `${pages.length} pages`}
          {sessionCount ? ` · ${sessionCount} sessions` : ""}
        </p>
        {room ? (
          <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/45">
            {room}
          </p>
        ) : null}
        {saved && !live ? (
          <p className="mt-2 rounded-md border border-[#FF9B70] bg-[#FF9B70]/12 px-2 py-1.5 text-[11.5px] leading-snug text-[#03002C]">
            A saved file exists for this division but was built on an older programme, so the
            approved master is shown instead.
          </p>
        ) : null}

        <Link
          to="/events/next/agendas"
          search={{ division: id, file: live?.id, edition: "london" }}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
        >
          <CalendarDays size={13} /> {live ? "Edit this agenda" : "Create this agenda"}
        </Link>
      </div>
    </article>
  );
}

export function LondonAgendaBoards({ divisionId = null }: { divisionId?: string | null }) {
  const savedFiles = useSavedAgendaFiles();
  const shown = divisionId ? AGENDA_DIVISIONS.filter((d) => d.id === divisionId) : AGENDA_DIVISIONS;

  return (
    <div className="mt-4">
      {divisionId && shown.length === 0 ? (
        <p className="border border-dashed border-[#03002C]/20 bg-white p-4 text-[13px] text-[#03002C]/70">
          This division has no track agenda in the London programme.
        </p>
      ) : null}
      <div
        className={`grid gap-4 ${divisionId ? "max-w-sm" : "sm:grid-cols-2 xl:grid-cols-4"}`}
      >
        {shown.map((div) => (
          <AgendaCard
            key={div.id}
            id={div.id}
            name={div.name}
            saved={pickAgendaFile(savedFiles.data, div.id, "london")}
          />
        ))}
      </div>
    </div>
  );
}
