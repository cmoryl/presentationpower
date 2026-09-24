// /events/next/san-francisco — the San Francisco edition of TransPerfect NEXT
// 2026.
//
// Issued so far: the location line and the venue, nothing else. This page shows
// exactly that, lists what the job can already produce, and names what each
// remaining piece is waiting on rather than borrowing London's numbers.

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Hotel,
  Lock,
  MapPin,
} from "lucide-react";

import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EditionDivisionTiles } from "@/components/events/EditionDivisionTiles";
import { CaliforniaKioskBrowser } from "@/components/events/CaliforniaKioskBrowser";
import { SF_READY, SF_VENUE, sfLocationStack } from "@/lib/next-sf-event";

export const Route = createFileRoute("/events/next_/san-francisco")({
  head: () => ({
    meta: [
      { title: "TransPerfect NEXT 2026 San Francisco · October 27–28, InterContinental" },
      {
        name: "description",
        content:
          "The San Francisco edition of TransPerfect NEXT 2026 — October 27–28, 2026 at the InterContinental San Francisco. Partner kiosks, badges, pillars and the sign schedule, plus what is still waiting to be issued.",
      },
      { property: "og:title", content: "TransPerfect NEXT 2026 — San Francisco" },
      {
        property: "og:description",
        content:
          "October 27–28, 2026, InterContinental San Francisco. Partner kiosk artwork, badge and pillar families, and an honest list of what has not been issued yet.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://transperfectelement.lovable.app/events/next/san-francisco",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://transperfectelement.lovable.app/events/next/san-francisco",
      },
    ],
  }),
  component: SanFranciscoPage,
});

const card = "rounded-md border border-[#03002C]/12 bg-white p-5";

type Gate = "locked" | "ready" | "pending";

const GATE_STYLE: Record<Gate, { label: string; cls: string; Icon: typeof Lock }> = {
  locked: { label: "Locked", cls: "border-[#03002C] bg-[#03002C] text-white", Icon: Lock },
  ready: {
    label: "Production ready",
    cls: "border-[#003FC7] bg-[#003FC7] text-white",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pending venue intake",
    cls: "border-dashed border-[#03002C]/40 bg-white text-[#03002C]",
    Icon: CircleDashed,
  },
};

function GateBadge({ gate }: { gate: Gate }) {
  const { label, cls, Icon } = GATE_STYLE[gate];
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] ${cls}`}
    >
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

const GATES: { id: string; gate: Gate; title: string; detail: string; anchor?: string }[] = [
  {
    id: "venue",
    gate: "locked",
    title: "Venue & dates",
    detail: `${SF_VENUE.venue}, ${SF_VENUE.datesLabel}. Printed word for word as issued.`,
  },
  {
    id: "kiosks",
    gate: "ready",
    title: "Partner kiosk templates",
    detail:
      "45 × 96 in front face with monitor keep-clear and both 4 × 96 in returns. .ai, print .pdf and .svg downloads.",
    anchor: "#sf-kiosks",
  },
  {
    id: "rooms",
    gate: "pending",
    title: "Room signage",
    detail: "Built once the finalised hotel floor plan and room list are issued.",
  },
  {
    id: "arrows",
    gate: "pending",
    title: "Directional arrows",
    detail: "Needs the finalised hotel floor plan to place routes and arrow faces.",
  },
  {
    id: "agendas",
    gate: "pending",
    title: "Division agendas",
    detail: "Needs the issued programme and the room each track runs in.",
  },
];

function SanFranciscoPage() {
  const [locationLine, venueLine] = sfLocationStack();
  const [divisionFocus, setDivisionFocus] = useState<string | null>(null);
  const alsoReady = SF_READY.filter((r) => r.id !== "kiosks");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <Link
            to="/events/next"
            className="inline-flex items-center gap-1.5 text-[#03002C]/65 hover:text-[#03002C]"
          >
            <ArrowLeft size={13} aria-hidden /> NEXT events
          </Link>
          <Link
            to="/events/$eventId"
            params={{ eventId: "san-francisco" }}
            className="text-[#003FC7] hover:underline"
          >
            Event home
          </Link>
          <Link
            to="/events/next/california"
            className="inline-flex items-center gap-1 text-[#003FC7] hover:underline"
          >
            California partner kiosks <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        <header className="mt-4 overflow-hidden rounded-md bg-[#03002C] p-8 text-white sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/75">
            TransPerfect NEXT 2026
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.05] sm:text-5xl">{locationLine}</h1>
          <p className="mt-3 text-base font-semibold uppercase tracking-[0.06em] text-white/85 sm:text-xl">
            {venueLine}
          </p>
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/85">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} aria-hidden /> {SF_VENUE.datesLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <Hotel size={15} aria-hidden /> {SF_VENUE.venue}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={15} aria-hidden /> {SF_VENUE.city}
            </span>
          </div>
        </header>

        {/* Production stage gates. */}
        <section className="mt-10" aria-labelledby="sf-gates">
          <h2 id="sf-gates" className="text-lg font-semibold text-[#03002C]">
            Production status
          </h2>
          <ul className="mt-4 divide-y divide-[#03002C]/10 border-y border-[#03002C]/10">
            {GATES.map((g) => (
              <li
                key={g.id}
                className="grid gap-2 py-4 sm:grid-cols-[200px_1fr_auto] sm:items-center"
              >
                <GateBadge gate={g.gate} />
                <div>
                  <p className="text-[15px] font-semibold text-[#03002C]">{g.title}</p>
                  <p className="mt-0.5 text-sm leading-[1.5] text-[#03002C]/70">{g.detail}</p>
                </div>
                {g.anchor ? (
                  <a
                    href={g.anchor}
                    className="text-[13px] font-semibold text-[#003FC7] hover:underline"
                  >
                    Open kiosks
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Partner kiosks, live. */}
        <section id="sf-kiosks" className="mt-12 scroll-mt-24" aria-labelledby="sf-kiosks-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#03002C]/10 pb-3">
            <div className="flex items-center gap-3">
              <h2 id="sf-kiosks-h" className="text-lg font-semibold text-[#03002C]">
                Partner kiosks
              </h2>
              <GateBadge gate="ready" />
            </div>
            <Link
              to="/events/next/california"
              className="text-[13px] font-semibold text-[#003FC7] hover:underline"
            >
              Template details and build notes
            </Link>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-[1.5] text-[#03002C]/70">
            45 × 96 in front face with the monitor keep-clear plus both 4 × 96 in return strips, at
            1/8 in bleed. Preview, edit copy and download .ai, print .pdf or .svg per face.
          </p>
          <div className="mt-5">
            <CaliforniaKioskBrowser />
          </div>
        </section>

        <EditionDivisionTiles
          editionLabel="San Francisco 2026"
          countsFor={() => ({ booths: 0, signage: 0 })}
          hasProgramme={false}
          signageIssued={false}
          selected={divisionFocus}
          onSelect={setDivisionFocus}
        />

        <section className="mt-12" aria-labelledby="sf-ready">
          <h2 id="sf-ready" className="text-lg font-semibold text-[#03002C]">
            Also available now
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {alsoReady.map((item) => (
              <article key={item.id} className={card}>
                <h3 className="text-[15px] font-semibold text-[#03002C]">{item.label}</h3>
                <p className="mt-2 text-sm leading-[1.5] text-[#03002C]/70">{item.detail}</p>
                {item.to ? (
                  <Link
                    to={item.to}
                    search={item.search ?? {}}
                    className="group mt-4 inline-flex items-center gap-2 rounded-md bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                  >
                    Open
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
