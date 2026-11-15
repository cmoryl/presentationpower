// Event workspaces, using registered facts rather than saved kit drafts.

import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, MapPin, Plus } from "lucide-react";

import { listStartedEvents } from "@/lib/event-intake.functions";
import { BUILT_IN_EVENTS } from "@/lib/event-registry";
import { SJB_EVENT, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { nextLockupSuite } from "@/lib/next-event-logos";
import { Button } from "@/design-system/element";
import ground from "@/assets/next-workspace/issued-cover-ground.jpg";
import { NEXT_EVENT } from "@/lib/next-event";
import { SF_VENUE } from "@/lib/next-sf-event";
import { EventCardPhoto } from "./EventCardPhoto";

type Card = { id: string; name: string; line: string; dates: string };

const cardCls =
  "group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EventHubCards() {
  const list = useServerFn(listStartedEvents);
  const started = useQuery({ queryKey: ["started-events"], queryFn: () => list(), retry: false });
  const eventDates: Record<string, string> = {
    [SJB_EVENT.id]: SJB_EVENT.kickoffUtc,
    london: NEXT_EVENT.startDate,
    "san-francisco": SF_VENUE.startDate,
  };

  const cards: Card[] = [
    ...[...BUILT_IN_EVENTS].sort((a, b) => (eventDates[b.id] ?? "").localeCompare(eventDates[a.id] ?? "")).map((e) => {
      return { id: e.id, name: e.name, line: [e.venue, e.city].filter(Boolean).join(" · "), dates: e.dates };
    }),
    ...(started.data?.events ?? []).map((e) => {
      return {
        id: e.event_id,
        name: e.name,
        line: [e.venue, e.city].filter(Boolean).join(" · "),
        dates: e.dates_label ?? "",
      };
    }),
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="relative flex aspect-[16/7] items-center justify-center overflow-hidden border-b border-border bg-muted p-6">
            {c.id === "london" || c.id === "san-francisco" ? <>
              <img src={ground} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <img src={nextLockupSuite("transperfect")?.wideWhite?.url} alt="TransPerfect NEXT" className="relative w-full max-w-64 object-contain" />
            </> : c.id === SJB_EVENT.id ? (
              <img src={SJB_LOGOS[0].svg} alt={`${SJB_EVENT.shortName} official logo`} className="h-full w-full object-contain" />
            ) : <CalendarDays className="h-12 w-12 text-muted-foreground" />}
            <EventCardPhoto eventId={c.id} eventName={c.name} />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-5">
            <h3 className="text-lg font-semibold leading-snug">{c.name}</h3>
            <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={15} className="mt-0.5 shrink-0" />{c.line || "Venue to be confirmed"}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays size={15} className="shrink-0" />{c.dates || "Dates to be confirmed"}</p>
            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Event workspace</span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">Open event <ArrowRight size={16} /></span>
            </div>
          </div>
        </Link>
      ))}
      <div className="flex items-center sm:col-span-2 lg:col-span-3">
        <Button asChild variant="outline"><Link to="/events/next/start"><Plus size={16} />Start a new event</Link></Button>
      </div>
    </div>
  );
}
