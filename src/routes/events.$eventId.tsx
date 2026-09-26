// /events/$eventId — one home per event. London, San Francisco and every event
// started from "Start a new event" share this layout: a header with the event's
// facts and tabs that open that event's existing tools, already scoped.

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { getEventIntake } from "@/lib/event-intake.functions";
import { EVENT_INTAKE_ITEMS, INTAKE_STATUS_LABEL, summarizeIntake, type IntakeStatus } from "@/lib/event-intake";
import {
  EVENT_TAB_LABEL,
  EVENT_TAB_ORDER,
  RESERVED_EVENT_IDS,
  builtInEvent,
  readinessProgress,
  startedEntry,
  type EventEntry,
  type EventTabId,
  type ReadyItem,
} from "@/lib/event-registry";

const tabIds = ["overview", ...EVENT_TAB_ORDER] as [string, ...string[]];
const SearchSchema = z.object({ tab: z.enum(tabIds).optional().catch(undefined) });

export const Route = createFileRoute("/events/$eventId")({
  validateSearch: (raw) => SearchSchema.parse(raw ?? {}),
  beforeLoad: ({ params }) => {
    if (RESERVED_EVENT_IDS.has(params.eventId) || !/^[a-z0-9-]{3,80}$/.test(params.eventId)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const e = builtInEvent(params.eventId);
    const title = e ? `${e.name} · Event home` : "Event home · TransPerfect Element";
    const desc = e
      ? `Everything for ${e.name} in one place — checklist, maps, schedule, agendas, signage and more.`
      : "One home for this event: checklist, maps, schedule, agendas, signage and badges.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-[900px] px-6 py-16 text-[#03002C]">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Link to="/events" className="mt-4 inline-block font-semibold text-primary">
          Back to events
        </Link>
      </div>
    </AppShell>
  ),
  component: EventHome,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";

function EventHome() {
  const { eventId } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const builtIn = builtInEvent(eventId);
  const fetchIntake = useServerFn(getEventIntake);
  const intake = useQuery({
    queryKey: ["event-intake", eventId],
    queryFn: () => fetchIntake({ data: { eventId } }),
    enabled: !builtIn,
  });

  const entry: EventEntry | null =
    builtIn ??
    (intake.data?.plan
      ? startedEntry({
          event_id: eventId,
          name: intake.data.plan.name,
          city: intake.data.plan.city,
          venue: intake.data.plan.venue,
          dates_label: intake.data.plan.dates_label,
        })
      : null);

  if (!entry) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[1100px] px-6 py-16 text-[#03002C]">
          {intake.isLoading ? (
            <p className="text-sm text-[#03002C]/70">Loading event…</p>
          ) : intake.isError ? (
            <p className="text-sm text-[#03002C]/70">Sign in to open this event.</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Event not found</h1>
              <Link to="/events/next/start" className="mt-4 inline-block font-semibold text-primary">
                Start a new event
              </Link>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  const tabs = entry.tabs;
  const active = tabs.find((t) => t.id === tab);
  const readiness: ReadyItem[] =
    entry.readiness ??
    EVENT_INTAKE_ITEMS.map((i) => {
      const status = (intake.data?.intake.find((r) => r.item_key === i.key)?.status ?? "missing") as IntakeStatus;
      const done = status === "received" || status === "not_needed";
      return {
        label: i.label,
        state: done ? "ready" : "waiting",
        detail: INTAKE_STATUS_LABEL[status],
        blockedOn: done ? undefined : i.ask,
        link: { to: "/events/next/intake/$eventId", params: { eventId } },
      };
    });
  const progress = readinessProgress(readiness);
  const summary = entry.readiness ? null : summarizeIntake((intake.data?.intake ?? []) as never);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 sm:px-8">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>
        <header className="mt-4">
          {eventId === "london" || eventId === "san-francisco" ? (
            <p className="mb-2 text-[13px] text-[#03002C]/75">
              Readiness checklist.{" "}
              <Link
                to={eventId === "london" ? "/events/next/london" : "/events/next/san-francisco"}
                className="font-semibold text-primary hover:underline"
              >
                Open the {eventId === "london" ? "London 2026" : "San Francisco 2026"} page →
              </Link>
            </p>
          ) : null}
          <h1 className="text-3xl font-bold leading-tight text-[#03002C]">{entry.name}</h1>
          <p className="mt-1 text-[15px] text-[#03002C]/75">
            {[entry.venue, entry.city, entry.dates].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-[#03002C]/10">
              <div
                className="h-full bg-[#003FC7]"
                style={{ width: `${progress.total ? (progress.ready / progress.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold text-[#03002C]">
              {progress.ready} of {progress.total} ready
            </span>
          </div>
        </header>

        <nav aria-label="Event sections" className="mt-6 flex flex-wrap gap-1 border-b border-[#03002C]/12">
          {(["overview", ...tabs.map((t) => t.id)] as const).map((id) => {
            const on = id === tab;
            return (
              <Link
                key={id}
                to="/events/$eventId"
                params={{ eventId }}
                search={{ tab: id === "overview" ? undefined : id }}
                aria-current={on ? "page" : undefined}
                className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${
                  on
                    ? "border-[#003FC7] text-[#03002C]"
                    : "border-transparent text-[#03002C]/60 hover:text-[#03002C]"
                }`}
              >
                {EVENT_TAB_LABEL[id as EventTabId | "overview"]}
              </Link>
            );
          })}
        </nav>

        {tab === "overview" || !active ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <ReadyList title="Ready now" items={readiness.filter((r) => r.state === "ready")} />
            <ReadyList title="Waiting" items={readiness.filter((r) => r.state === "waiting")} />
            {summary && (
              <p className="text-sm text-[#03002C]/75 lg:col-span-2">
                {summary.mapsReady
                  ? "Every required item is in — the maps can leave draft."
                  : `Maps stay in draft until these arrive: ${summary.blocking.join(", ")}.`}
              </p>
            )}
          </section>
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {active.tools.map((t) => (
              <Link key={t.label} {...t.link} className={`${card} group block hover:border-[#003FC7]`}>
                <div className="flex items-center justify-between font-semibold text-[#03002C]">
                  {t.label}
                  <ArrowRight className="h-4 w-4 text-[#003FC7]" />
                </div>
                <p className="mt-1 text-sm text-[#03002C]/70">{t.detail}</p>
              </Link>
            ))}
            {active.waitingOn && (
              <div className={`${card} border-dashed`}>
                <div className="flex items-center gap-2 font-semibold text-[#03002C]">
                  <CircleDashed className="h-4 w-4" /> Waiting
                </div>
                <p className="mt-1 text-sm text-[#03002C]/70">
                  Nothing is drawn or guessed until we have {active.waitingOn}.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ReadyList({ title, items }: { title: string; items: ReadyItem[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[#03002C]">{title}</h2>
      {!items.length && <p className="mt-2 text-sm text-[#03002C]/65">Nothing here.</p>}
      <ul className="mt-3 grid gap-2">
        {items.map((i) => (
          <li key={i.label} className={card}>
            <div className="flex items-start gap-2">
              {i.state === "ready" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#003FC7]" />
              ) : (
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-[#03002C]/50" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[#03002C]">{i.label}</div>
                {i.state === "waiting" && i.blockedOn && (
                  <p className="mt-0.5 text-sm text-[#03002C]/70">Waiting on {i.blockedOn}</p>
                )}
                {i.link && (
                  <Link {...i.link} className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
                    {i.state === "ready" ? "Open" : "Next step"} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
