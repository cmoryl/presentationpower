import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { AgendaHouseTimesPanel } from "@/components/next/AgendaHouseTimesPanel";
import { InnovationLoungeInfo } from "@/components/next/InnovationLoungeInfo";

import { AgendaStudio } from "@/components/next/AgendaStudio";

import { useSavedAgendaFiles } from "@/hooks/use-next-live-masters";
import { agendaDivision, agendaFileIsLive, normalizeAgendaConfig } from "@/lib/next-agenda";

const search = z.object({
  division: z.string().optional(),
  file: z.string().optional(),
  edition: z.string().optional(),
});

export const Route = createFileRoute("/events/next_/agendas")({
  validateSearch: (input: Record<string, unknown>) => search.parse(input),

  head: () => ({
    meta: [
      { title: "NEXT division agenda builder · Editable agenda boards for print" },
      {
        name: "description",
        content:
          "Build and edit the NEXT agenda board for any division area: programme rows, A4 to A1 formats, dark and light approved faces, scannable QR codes and layered vector PDF / Illustrator export.",
      },
      { property: "og:title", content: "NEXT division agenda builder" },
      {
        property: "og:description",
        content:
          "One approved NEXT agenda master, live per division: editable programme, approved gradient grounds and press-ready layered vector exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const { division, file, edition } = Route.useSearch();
  const resolved = agendaDivision(division);
  const saved = useSavedAgendaFiles();

  // Open straight onto the saved live board ONLY when the link names one. A
  // plain /agendas?division=… visit must start from the division default: with
  // several people building at once, silently loading somebody else's latest
  // saved file replaced a half-typed programme seconds after it appeared and
  // turned Save into an overwrite of their file. The saved list in step 4 stays
  // the way to pick a file up deliberately.
  // A file saved off an older programme is skipped: opening it would show stale
  // rows in place of the division's approved programme. It stays in the saved
  // list in step 4 for anyone who wants it deliberately.
  const openFile = useMemo(() => {
    if (!file) return undefined;
    const row = saved.data?.find((r) => r.id === file);
    if (!row) return undefined;
    const config = normalizeAgendaConfig(row.config);
    if (!agendaFileIsLive(config)) return undefined;
    return { id: row.id, config };
  }, [file, saved.data]);


  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> TransPerfect NEXT
        </Link>
        {edition === "san-francisco" ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#03002C]/25 bg-white/70 p-4">
            <div className="text-sm font-semibold text-[#03002C]">
              San Francisco default board · October 27–28, 2026
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[#03002C]/70">
              No San Francisco programme has been issued, so every session slot reads TO BE
              CONFIRMED. Registration, break, lunch, reception and close times are carried from the
              flagship house times, not measured against a San Francisco run of show. Type the
              programme in when it arrives — the frame, dates and venue line are already right.
            </p>
            <Link
              to="/events/next/san-francisco"
              className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
            >
              San Francisco event page
            </Link>
          </div>
        ) : (
          <AgendaHouseTimesPanel divisionId={resolved.id} />
        )}
        <AgendaStudio

          key={`${resolved.id}|${edition ?? "london"}|${openFile?.id ?? "new"}`}
          divisionId={resolved.id}
          edition={edition}
          initialConfig={openFile?.config}
          initialFileId={openFile?.id ?? null}
          heading={`${resolved.name} — agenda`}
          intro="The approved NEXT agenda master, live for this division area. Edit the programme rows, choose the board format and face, add a scannable QR code, save the live file and export layered vector artwork for print and Illustrator."
        />
        {resolved.id === "innovation-lounge" ? <InnovationLoungeInfo /> : null}

      </div>
    </AppShell>
  );
}
