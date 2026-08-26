import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PillarStudio } from "@/components/next/PillarStudio";

export const Route = createFileRoute("/events/pillars")({
  head: () => ({
    meta: [
      { title: "Event pillar sign generator · Any pillar size, live print files" },
      {
        name: "description",
        content:
          "Build event pillar signage for any measured pillar footprint: welcome, registration, logo and directional faces with sub-lines, real scannable QR codes, saved live files and high-resolution print export.",
      },
      { property: "og:title", content: "Event pillar sign generator" },
      {
        property: "og:description",
        content:
          "Selectable pillar footprints, sub-lines, printable QR codes and press-ready PDF + Illustrator exports on the approved brand grounds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventPillarPage,
});

function EventPillarPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> Events
        </Link>
        <PillarStudio
          scope="events"
          heading="Event pillar sign generator"
          intro="Any event, any pillar. Pick the measured pillar footprint — thin columns through full wrap faces or a custom trim — set the copy and sub-line, drop in a real scannable QR code, save the live file for later edits and export a press-ready package."
        />
      </div>
    </AppShell>
  );
}
