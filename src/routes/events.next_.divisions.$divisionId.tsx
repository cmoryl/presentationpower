import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { DivisionSignageKit } from "@/components/events/DivisionSignageKit";
import { LONDON_DIVISION_ACCENTS } from "@/lib/next-london-division";

export const Route = createFileRoute("/events/next_/divisions/$divisionId")({
  loader: ({ params }) => {
    const accent = LONDON_DIVISION_ACCENTS[params.divisionId];
    if (!accent) throw notFound();
    return { id: params.divisionId, label: accent.label };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Division not found" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.label} NEXT signage templates · TransPerfect`;
    const description = `${loaderData.label} starter signage built from the NEXT 2026 London kit: doors, scenic panels, table-tops, booth and step-and-repeat, as SVG and Illustrator files.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: DivisionMissing,
  errorComponent: DivisionMissing,
  component: DivisionSignagePage,
});

function DivisionMissing() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-2xl font-semibold">No signage for this division</h1>
        <Link to="/events/next/divisions" className="mt-4 inline-block text-sm text-primary hover:underline">
          See every division
        </Link>
      </div>
    </AppShell>
  );
}

function DivisionSignagePage() {
  const { id, label } = Route.useLoaderData();
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Link to="/events/next/divisions" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> All divisions
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{label} signage</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          Starter signs from the NEXT 2026 London kit, re-branded for {label}: same sizes, bleed and grounds
          as London, the white {label} lockup, and the {label} accent as a light tint. Downloads pass the London
          print checks and are named <span className="font-mono">rdraft-</span> because they are templates, not a
          published revision. London printed no A-frames, so none are offered.
        </p>
        <div className="mt-8">
          <DivisionSignageKit divisionId={id} />
        </div>
      </div>
    </AppShell>
  );
}
