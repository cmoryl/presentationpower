// /events/next/intake/$eventId — what the venue and organisers still need to
// send, plus online research findings waiting to be confirmed.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Search, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  getEventIntake,
  researchVenue,
  setIntakeStatus,
  setResearchStatus,
} from "@/lib/event-intake.functions";
import {
  EVENT_INTAKE_ITEMS,
  INTAKE_STATUS_LABEL,
  summarizeIntake,
  type IntakeStatus,
} from "@/lib/event-intake";

export const Route = createFileRoute("/events/next_/intake/$eventId")({
  head: () => ({
    meta: [
      { title: "Venue intake — what the event still needs" },
      {
        name: "description",
        content:
          "Track floor plans, room lists, programme and logos for a new event, and confirm what online research found.",
      },
      { property: "og:title", content: "Event venue intake" },
      {
        property: "og:description",
        content: "The checklist and research that come before a new event's maps and signage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntakePage,
});

const card = "rounded-2xl border border-[#03002C]/12 bg-white p-5";
const btn =
  "inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-[#F2F2F2] disabled:opacity-50";
const TONE: Record<IntakeStatus, string> = {
  missing: "bg-[#FF9B70]/25",
  received: "bg-[#A6FA87]/40",
  scan: "bg-[#FFEB66]/50",
  found_online: "bg-[#A1FBF9]/50",
  not_needed: "bg-[#F2F2F2]",
};

function IntakePage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getEventIntake);
  const setItem = useServerFn(setIntakeStatus);
  const setFinding = useServerFn(setResearchStatus);
  const research = useServerFn(researchVenue);
  const key = ["event-intake", eventId];
  const q = useQuery({ queryKey: key, queryFn: () => get({ data: { eventId } }) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const rows = q.data?.intake ?? [];
  const summary = summarizeIntake(rows as never);
  const plan = q.data?.plan;

  const runResearch = async () => {
    if (!plan?.venue || !plan.city || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await research({ data: { eventId, venue: plan.venue, city: plan.city } });
      setMsg(
        r.found
          ? `Found ${r.found} suggestions from ${r.pagesRead} pages. Confirm the ones that are right.`
          : `Read ${r.pagesRead} pages but found nothing usable. Ask the venue directly.`,
      );
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Research failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1000px] px-5 pb-24 pt-8 sm:px-8">
        <Link
          to="/events/next/start"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#03002C]/70 hover:text-[#03002C]"
        >
          <ArrowLeft className="h-4 w-4" /> Started events
        </Link>
        {q.isError && (
          <p className="mt-6 text-sm text-[#E53D2E]">
            {q.error instanceof Error ? q.error.message : "Couldn't load this event."}
          </p>
        )}
        <h1 className="mt-5 text-3xl font-bold leading-tight text-[#03002C]">
          {plan?.name ?? eventId}
        </h1>
        <p className="mt-1 text-[15px] text-[#03002C]/70">
          {[plan?.venue, plan?.city, plan?.dates_label].filter(Boolean).join(" · ")}
        </p>

        <div className={`${card} mt-6`}>
          <p className="text-[15px] font-semibold text-[#03002C]">
            {summary.received} of {summary.total} items in.{" "}
            {summary.mapsReady
              ? "Everything the maps need has arrived."
              : `Maps stay in draft until these arrive: ${summary.blocking.join(", ")}.`}
          </p>
          <p className="mt-1 text-sm text-[#03002C]/65">
            Once the floor plans arrive, load them into the{" "}
            <Link to="/events/next/maps/$eventId" params={{ eventId }} className="font-semibold underline">
              venue maps
            </Link>
            .
          </p>
        </div>

        <h2 className="mt-8 text-lg font-bold text-[#03002C]">What we need</h2>
        <ul className="mt-3 grid gap-3">
          {EVENT_INTAKE_ITEMS.map((item) => {
            const row = rows.find((r) => r.item_key === item.key);
            const status = (row?.status ?? "missing") as IntakeStatus;
            return (
              <li key={item.key} className={`${card} flex flex-wrap items-start justify-between gap-3`}>
                <div className="min-w-0 max-w-[60ch]">
                  <p className="font-semibold text-[#03002C]">
                    {item.label}
                    {item.required && <span className="ml-2 text-xs font-medium text-[#03002C]/60">required</span>}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#03002C]/70">{item.ask}</p>
                </div>
                <label className="text-xs font-semibold text-[#03002C]">
                  <span className="sr-only">Status for {item.label}</span>
                  <select
                    className={`rounded-lg border border-[#03002C]/20 px-3 py-2 text-sm ${TONE[status]}`}
                    value={status}
                    onChange={async (e) => {
                      await setItem({
                        data: { eventId, itemKey: item.key, status: e.target.value as IntakeStatus, note: row?.note ?? null },
                      });
                      refresh();
                    }}
                  >
                    {(Object.keys(INTAKE_STATUS_LABEL) as IntakeStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {INTAKE_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#03002C]">Found online</h2>
          <button type="button" className={btn} onClick={runResearch} disabled={busy || !plan?.venue}>
            <Search className="h-4 w-4" /> {busy ? "Searching…" : "Research this venue"}
          </button>
        </div>
        <p className="mt-1 text-sm text-[#03002C]/65">
          Suggestions from the venue's own web pages. Nothing here prints until you confirm it, and
          a plan found online is a tracing guide, not the print file.
        </p>
        {msg && <p className="mt-3 text-sm font-semibold text-[#03002C]">{msg}</p>}
        <ul className="mt-3 grid gap-2">
          {(q.data?.research ?? []).map((f) => (
            <li
              key={f.id}
              className={`${card} flex flex-wrap items-start justify-between gap-3 ${f.status === "rejected" ? "opacity-50" : ""}`}
            >
              <div className="min-w-0 max-w-[62ch]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#03002C]/60">
                  {EVENT_INTAKE_ITEMS.find((i) => i.key === f.item_key)?.label ?? f.item_key} ·{" "}
                  {f.status === "confirmed" ? "Confirmed" : f.status === "rejected" ? "Rejected" : "Found online — confirm with venue"}
                </p>
                <p className="mt-1 text-[15px] text-[#03002C]">
                  <span className="font-semibold">{f.label}:</span> {f.value}
                </p>
                <a
                  href={f.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary underline"
                >
                  {f.source_title || f.source_url} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btn}
                  aria-label="Confirm"
                  onClick={async () => {
                    await setFinding({ data: { id: f.id, status: "confirmed" } });
                    refresh();
                  }}
                >
                  <Check className="h-4 w-4" /> Confirm
                </button>
                <button
                  type="button"
                  className={btn}
                  aria-label="Reject"
                  onClick={async () => {
                    await setFinding({ data: { id: f.id, status: "rejected" } });
                    refresh();
                  }}
                >
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            </li>
          ))}
          {q.data && !q.data.research.length && (
            <li className="text-sm text-[#03002C]/65">No research yet.</li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
