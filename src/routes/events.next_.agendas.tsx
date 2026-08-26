import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { AgendaStudio } from "@/components/next/AgendaStudio";
import { agendaDivision } from "@/lib/next-agenda";

const search = z.object({ division: z.string().optional() });

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
  const { division } = Route.useSearch();
  const resolved = agendaDivision(division);
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> TransPerfect NEXT
        </Link>
        <AgendaStudio
          key={resolved.id}
          divisionId={resolved.id}
          heading={`${resolved.name} — agenda`}
          intro="The approved NEXT agenda master, live for this division area. Edit the programme rows, choose the board format and face, add a scannable QR code, save the live file and export layered vector artwork for print and Illustrator."
        />
      </div>
    </AppShell>
  );
}
