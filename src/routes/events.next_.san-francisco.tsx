// /events/next/san-francisco — the San Francisco edition of TransPerfect NEXT
// 2026.
//
// Issued so far: the location line and the venue, nothing else. This page shows
// exactly that, lists what the job can already produce, and names what each
// remaining piece is waiting on rather than borrowing London's numbers.

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, CircleDashed, Hotel, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SF_READY, SF_VENUE, SF_WAITING, sfLocationStack } from "@/lib/next-sf-event";

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
      { property: "og:url", content: "https://transperfectelement.lovable.app/events/next/san-francisco" },
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

const card =
  "rounded-2xl border border-[#03002C]/12 bg-white p-5 shadow-[0_12px_28px_-24px_rgba(3,0,44,0.35)]";
const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/15 bg-[#F2F2F2] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/70";

function SanFranciscoPage() {
  const [locationLine, venueLine] = sfLocationStack();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <Link
          to="/events/next"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#03002C]/60 hover:text-[#03002C]"
        >
          <ArrowLeft size={13} aria-hidden /> NEXT events
        </Link>

        {/* The issued lines, set the way the covers set them. */}
        <header className="mt-4 overflow-hidden rounded-3xl bg-[#03002C] p-8 text-white sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            TransPerfect NEXT 2026
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
            {locationLine}
          </h1>
          <p className="mt-3 text-base font-semibold uppercase tracking-[0.06em] text-white/85 sm:text-xl">
            {venueLine}
          </p>
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <span className="inline-flex items-center gap-2 text-white/80">
              <CalendarDays size={15} aria-hidden /> {SF_VENUE.datesLabel}
            </span>
            <span className="inline-flex items-center gap-2 text-white/80">
              <Hotel size={15} aria-hidden /> {SF_VENUE.venue}
            </span>
            <span className="inline-flex items-center gap-2 text-white/80">
              <MapPin size={15} aria-hidden /> {SF_VENUE.city}
            </span>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-[1.6] text-white/65">
            These two lines are the only San Francisco facts that have been issued. Everything on
            this page prints them word for word — no street address, floor plan, programme or
            capacity is stated anywhere until one is sent.
          </p>
        </header>

        {/* Ready to use now. */}
        <section className="mt-10" aria-labelledby="sf-ready">
          <h2 id="sf-ready" className="text-lg font-semibold tracking-[-0.02em] text-[#03002C]">
            Ready to work on now
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-[1.5] text-[#03002C]/65">
            These families carry over from the flagship build and can be edited and downloaded
            today.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {SF_READY.map((item) => (
              <article key={item.id} className={card}>
                <h3 className="text-[15px] font-semibold text-[#03002C]">{item.label}</h3>
                <p className="mt-2 text-sm leading-[1.5] text-[#03002C]/70">{item.detail}</p>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="group mt-4 inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Open
                    <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {/* Honest gaps. */}
        <section className="mt-12" aria-labelledby="sf-waiting">
          <h2 id="sf-waiting" className="text-lg font-semibold tracking-[-0.02em] text-[#03002C]">
            Waiting to be issued
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-[1.5] text-[#03002C]/65">
            Each of these stays blank on purpose. Send the missing piece and it is built the same
            day.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {SF_WAITING.map((item) => (
              <li key={item.id} className={`${card} border-dashed`}>
                <div className="flex items-center gap-2">
                  <CircleDashed size={15} className="text-[#03002C]/45" aria-hidden />
                  <h3 className="text-[15px] font-semibold text-[#03002C]">{item.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-[1.5] text-[#03002C]/70">{item.detail}</p>
                {item.blockedOn ? (
                  <p className="mt-3 text-[13px] leading-[1.5] text-[#03002C]/55">
                    <span className="font-semibold text-[#03002C]/75">Needs:</span>{" "}
                    {item.blockedOn}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className={pill}>{SF_VENUE.datesLabel}</span>
            <span className={pill}>{SF_VENUE.colourSpace}</span>
            <Link
              to="/events/next/london"
              className="text-[13px] font-semibold text-[#003FC7] hover:underline"
            >
              The London flagship kit these families come from
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
