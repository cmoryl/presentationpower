// /events/next/planning-guide — the event-planning half of the old brand kit
// page: event sections, NEXT Mart, NEXTbrew, pillar/area options, new city.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BrandKitGuideSections, PLANNING_GUIDE_SECTIONS } from "@/components/events/brand-kit/BrandKitGuideSections";
import { BrandKitPillarAreaSections, PILLAR_AREA_SECTIONS } from "@/components/events/brand-kit/BrandKitPillarAreaSections";
import { NEW_CITY_CHECKLIST } from "@/lib/next-brand-kit";

export const Route = createFileRoute("/events/next_/planning-guide")({
  head: () => ({
    meta: [
      { title: "NEXT planning guide · TransPerfect Element" },
      { name: "description", content: "How to plan a TransPerfect NEXT event: event sections, NEXT Mart, NEXTbrew, pillar and area options, and starting a new city." },
      { property: "og:title", content: "NEXT planning guide" },
      { property: "og:description", content: "Event sections, NEXT Mart, NEXTbrew, pillar and area options for every NEXT city." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanningGuidePage,
});

const SECTIONS = [...PLANNING_GUIDE_SECTIONS, ...PILLAR_AREA_SECTIONS, ["new-city", "Starting a new city"]] as const;

function PlanningGuidePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">TransPerfect NEXT</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">Planning guide</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            What goes into every NEXT city: the event sections, NEXT Mart, NEXTbrew, pillar and area options, and the steps to start a new city. Logos and colours are in the brand kit.
          </p>
        </header>
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          <nav aria-label="Planning guide sections" className="sticky top-0 z-10 -mx-6 flex gap-4 overflow-x-auto bg-background/95 px-6 py-3 text-sm lg:top-6 lg:mx-0 lg:h-fit lg:flex-col lg:gap-2 lg:px-0 lg:py-8">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap font-medium text-muted-foreground hover:text-foreground">{label}</a>
            ))}
          </nav>
          <div className="min-w-0">
            <BrandKitGuideSections shared={false} part="planning" />
            <BrandKitPillarAreaSections />
            <section id="new-city" className="mt-12 scroll-mt-16">
              <h2 className="text-xl font-semibold">Starting a new city</h2>
              <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {NEW_CITY_CHECKLIST.map((c, i) => (
                  <li key={c.step}>
                    <p className="text-xs font-semibold text-muted-foreground">Step {i + 1}</p>
                    <p className="text-sm font-semibold">{c.step}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
