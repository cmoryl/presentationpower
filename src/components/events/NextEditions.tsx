/**
 * Edition-first entry on the NEXT master page: upcoming / live location
 * editions first, past editions below. Status comes from the issued dates;
 * stops without dates are listed as "to be confirmed" and are not linked.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { NEXT_CITY_SERIES, type NextCityStop } from "@/lib/next-event";

const EDITION_ROUTES: Record<string, "/events/next/london" | "/events/next/san-francisco"> = {
  london: "/events/next/london",
  "san-francisco": "/events/next/san-francisco",
};

function statusOf(stop: NextCityStop, today: string): "live" | "upcoming" | "past" | "tbc" {
  if (!stop.startDate || !stop.endDate) return "tbc";
  if (stop.endDate < today) return "past";
  if (stop.startDate <= today) return "live";
  return "upcoming";
}

const STATUS_LABEL = { live: "On now", upcoming: "Upcoming", past: "Past", tbc: "Dates TBC" };

function EditionCard({ stop, status }: { stop: NextCityStop; status: keyof typeof STATUS_LABEL }) {
  const to = EDITION_ROUTES[stop.id];
  const body = (
    <>
      <span
        className={`block h-1.5 w-full ${status === "live" ? "bg-[#003FC7]" : status === "past" ? "bg-[#666666]" : "bg-[#03002C]"}`}
        aria-hidden
      />
      <span className="flex flex-1 flex-col p-5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {STATUS_LABEL[status]}
        </span>
        <span className="mt-2 text-lg font-semibold leading-tight">
          {stop.city} {stop.startDate ? stop.startDate.slice(0, 4) : ""}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">
          {[stop.venue, stop.datesLabel].filter(Boolean).join(" · ") || stop.country}
        </span>
        {to ? (
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#003FC7]">
            Open edition <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </span>
    </>
  );
  const cls = "group flex flex-col overflow-hidden rounded-md border border-border bg-card";
  return to ? (
    <Link to={to} className={`${cls} transition hover:border-foreground/40`}>
      {body}
    </Link>
  ) : (
    <div className={`${cls} opacity-70`}>{body}</div>
  );
}

export function NextEditions() {
  const today = new Date().toISOString().slice(0, 10);
  const stops = NEXT_CITY_SERIES.stops.map((s) => ({ stop: s, status: statusOf(s, today) }));
  const current = stops.filter((s) => s.status === "live" || s.status === "upcoming");
  const past = stops.filter((s) => s.status === "past");
  const tbc = stops.filter((s) => s.status === "tbc");

  return (
    <section className="mt-12" aria-labelledby="next-editions">
      <h2 id="next-editions" className="text-xl font-semibold tracking-tight">
        Editions
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Go into a location edition to work on its venue, divisions and assets.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {current.map(({ stop, status }) => (
          <EditionCard key={stop.id} stop={stop} status={status} />
        ))}
      </div>

      <h3 className="mt-8 text-sm font-semibold">Past editions</h3>
      {past.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {past.map(({ stop, status }) => (
            <EditionCard key={stop.id} stop={stop} status={status} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No past editions yet — an edition moves here once its last day has passed.
        </p>
      )}

      {tbc.length ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Dates to be confirmed: {tbc.map((s) => s.stop.city).join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
