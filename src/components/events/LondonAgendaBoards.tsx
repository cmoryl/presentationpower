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
import { AGENDA_DIVISIONS, agendaDefault, type AgendaConfig } from "@/lib/next-agenda";
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
  const config: AgendaConfig = useMemo(
    () => (saved ? saved.config : agendaDefault(id)),
    [saved, id],
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex justify-center bg-[#F2F2F2] p-3">
        <AgendaSheet config={config} pxPerMm={0.2} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
          {saved ? "Live board" : "Editable master"}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#03002C]">{name}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#03002C]/65">
          {config.trimW}×{config.trimH} mm · {config.face} face · multi-day, multi-page programme.
        </p>
        <Link
          to="/events/next/agendas"
          search={{ division: id, file: saved?.id }}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#003FC7] hover:underline"
        >
          <CalendarDays size={13} /> {saved ? "Edit this agenda" : "Create this agenda"}
        </Link>
      </div>
    </article>
  );
}

export function LondonAgendaBoards() {
  const savedFiles = useSavedAgendaFiles();

  return (
    <div className="mt-4">
      <p className="text-[13px] leading-relaxed text-[#03002C]/70">
        Editable agenda boards, A4 to A1, for every division area at the QEII Centre. Programme
        rows, approved grounds, dark and light faces, scannable QR codes and layered vector export
        for print.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {AGENDA_DIVISIONS.map((div) => (
          <AgendaCard
            key={div.id}
            id={div.id}
            name={div.name}
            saved={pickAgendaFile(savedFiles.data, div.id)}
          />
        ))}
      </div>
    </div>
  );
}
