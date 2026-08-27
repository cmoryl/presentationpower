// City Series demo assets: a prepared, fully editable agenda board and the four
// master pillars in the approved light face — all seeded straight into the
// studio editors so they can be updated and exported.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AgendaStudio } from "@/components/next/AgendaStudio";
import { PillarSign } from "@/components/next/PillarSign";
import { PillarStudio } from "@/components/next/PillarStudio";
import {
  CITY_SERIES_DEMO_EVENT,
  citySeriesDemoAgenda,
  citySeriesDemoPillars,
} from "@/lib/next-city-series-demo";

export const Route = createFileRoute("/events/next_/city-series")({
  head: () => ({
    meta: [
      { title: "NEXT City Series demo kit · Editable agenda board + light pillars" },
      {
        name: "description",
        content:
          "A prepared NEXT City Series agenda board and the four master pillars in the approved light face, seeded live into the studio editors for editing and press-ready export.",
      },
      { property: "og:title", content: "NEXT City Series demo kit" },
      {
        property: "og:description",
        content:
          "Editable City Series agenda board plus welcome, registration, logo and directional pillars on the approved light gradient face.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CitySeriesDemoPage,
});

function CitySeriesDemoPage() {
  const pillars = useMemo(() => citySeriesDemoPillars(), []);
  const agenda = useMemo(() => citySeriesDemoAgenda(), []);
  const [pillarIndex, setPillarIndex] = useState(0);
  const active = pillars[pillarIndex]!;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#003FC7]"
        >
          <ArrowLeft size={13} /> TransPerfect NEXT
        </Link>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            City Series · demo kit
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
            City Series agenda board + light-face pillars
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-[1.5] text-muted-foreground">
            A prepared demo set for {CITY_SERIES_DEMO_EVENT}: one A1 agenda board and the four
            master pillars — welcome, registration, general logo and directional — all built on the
            approved light gradient face. Everything below is a live studio file, so edit the copy,
            programme, QR codes and geometry, save it to the event and export layered vector art.
          </p>
        </header>

        <section className="mt-10" aria-labelledby="cs-pillars">
          <h2 id="cs-pillars" className="text-lg font-semibold tracking-[-0.02em]">
            Light-face pillars
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a pillar to load it into the editor underneath.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, i) => {
              const selected = i === pillarIndex;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setPillarIndex(i)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/25"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex justify-center overflow-hidden rounded-lg bg-muted/40 p-2">
                    <PillarSign config={pillar.config} pxPerMm={0.11} />
                  </div>
                  <p className="mt-3 text-sm font-medium">{pillar.label}</p>
                  <p className="mt-1 text-xs leading-[1.45] text-muted-foreground">{pillar.note}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <PillarStudio
            key={active.id}
            scope="next-city-series"
            heading={`${active.label} pillar — City Series demo`}
            intro="Loaded from the City Series demo kit on the approved light face. Edit the copy, footprint, QR code and lockup scale, then save the live file to the event or export layered PDF / Illustrator art."
            initialConfig={active.config}
          />
        </div>

        <div className="mt-14 border-t border-border pt-10">
          <AgendaStudio
            divisionId="city-series"
            initialConfig={agenda}
            heading="City Series agenda board — demo"
            intro="A prepared City Series day-one programme on the approved light face at A1. Edit the rows, format, QR code and footer, save it to the event and export layered vector artwork for print and Illustrator."
          />
        </div>
      </div>
    </AppShell>
  );
}
