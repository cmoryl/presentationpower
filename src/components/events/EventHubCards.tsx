// "Your events" row on the Events page: every event as one card with its
// progress, plus "Start a new event" at the end.

import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Map, Plus } from "lucide-react";

import { listStartedEvents } from "@/lib/event-intake.functions";
import { summarizeIntake, type IntakeRow } from "@/lib/event-intake";
import { BUILT_IN_EVENTS, readinessProgress } from "@/lib/event-registry";

type Card = { id: string; name: string; line: string; ready: number; total: number };

const cardCls =
  "group flex flex-col rounded-2xl border border-black/10 bg-white p-5 transition hover:border-[#003FC7] hover:shadow-[0_10px_30px_-14px_rgba(3,0,44,0.3)]";

export function EventHubCards() {
  const list = useServerFn(listStartedEvents);
  const started = useQuery({ queryKey: ["started-events"], queryFn: () => list(), retry: false });

  const cards: Card[] = [
    ...BUILT_IN_EVENTS.map((e) => {
      const p = readinessProgress(e.readiness ?? []);
      return { id: e.id, name: e.name, line: [e.venue, e.dates].join(" · "), ...p };
    }),
    ...(started.data?.events ?? []).map((e) => {
      const rows = (started.data?.intake ?? []).filter((r) => r.event_id === e.event_id) as IntakeRow[];
      const s = summarizeIntake(rows);
      return {
        id: e.event_id,
        name: e.name,
        line: [e.venue, e.city, e.dates_label].filter(Boolean).join(" · "),
        ready: s.received,
        total: s.total,
      };
    }),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.id}
          {...(c.id === "london"
            ? { to: "/events/next/london" as const }
            : c.id === "san-francisco"
              ? { to: "/events/next/san-francisco" as const }
              : { to: "/events/$eventId" as const, params: { eventId: c.id } })}
          className={cardCls}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#03002C]/10 text-[#03002C] dark:bg-card">
            <Map size={16} />
          </span>
          <div className="mt-4 text-lg font-semibold text-[#03002C]">{c.name}</div>
          <p className="mt-1 flex-1 text-sm text-[#03002C]/70">{c.line}</p>
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#03002C]/10 dark:bg-card">
              <div className="h-full bg-primary" style={{ width: `${c.total ? (c.ready / c.total) * 100 : 0}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#03002C]/65">
              <span>
                {c.ready} of {c.total} ready
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-[#003FC7]">
                Open <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </Link>
      ))}
      <Link to="/events/next/start" className={`${cardCls} border-dashed border-[#03002C]/25`}>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[#003FC7]">
          <Plus size={16} />
        </span>
        <div className="mt-4 text-lg font-semibold text-[#03002C]">Start a new event</div>
        <p className="mt-1 flex-1 text-sm text-[#03002C]/70">
          Sets up the checklist, an empty map set and a web search for the venue.
        </p>
      </Link>
    </div>
  );
}
