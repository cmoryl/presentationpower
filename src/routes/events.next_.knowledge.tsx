// /events/next/knowledge — the ACTIVE event knowledge store.
//
// The playbook is what we wrote down. This is what the build can be asked. Every
// measured sign spec, template family, approved ground, lesson entry and shipped
// live file is embedded once, so a new venue can ask a question in its own words
// — "how big were the room door vinyls" — and get the London precedent back with
// its facts attached, instead of someone re-deriving it from 154 rows.
//
// Precedent is never presented as the new venue's truth: placement and size
// answers carry the same "confirm on survey" caveat the harvest writes in.

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/design-system/element";
import {
  embedEventKnowledgeBacklog,
  eventKnowledgeCoverage,
  searchEventKnowledge,
  syncEventKnowledge,
} from "@/lib/event-knowledge.functions";
import type { EventKnowledgeHit, EventKnowledgeKind } from "@/lib/event-knowledge";
import { LONDON_VENUE } from "@/lib/next-london-signage";

export const Route = createFileRoute("/events/next_/knowledge")({
  head: () => ({
    meta: [
      { title: "NEXT event knowledge · ask what past venues taught" },
      {
        name: "description",
        content:
          "Search everything the NEXT venue builds have taught: measured sign specs, reusable template families, approved grounds, build lessons and every live file that shipped.",
      },
      { property: "og:title", content: "NEXT event knowledge store" },
      {
        property: "og:description",
        content:
          "Ask the build what a past venue taught — measured faces, template families, grounds, lessons and shipped live files, searchable in plain language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KnowledgePage,
});

const KIND_LABELS: Record<EventKnowledgeKind, string> = {
  spec: "Measured spec",
  placement: "Placement precedent",
  ground: "Approved ground",
  substrate: "Substrate & print",
  lesson: "Build lesson",
  outcome: "Shipped live file",
};

const KIND_TONES: Record<EventKnowledgeKind, string> = {
  spec: "bg-[#E0E8F5] text-[#003FC7]",
  placement: "bg-[#EEF1F7] text-[#03002C]",
  ground: "bg-[#F2F2F2] text-[#03002C]",
  substrate: "bg-[#F2F2F2] text-[#03002C]",
  lesson: "bg-[#FFEB66]/45 text-[#03002C]",
  outcome: "bg-[#A6FA87]/40 text-[#03002C]",
};

const EXAMPLES = [
  "How big were the room door vinyls, and were they double doors?",
  "Which grounds are approved for a press wall?",
  "What did we learn about exporting QR codes for print?",
  "Step and repeat wall sizes and returns",
  "Which sign families have no template yet?",
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="text-2xl font-semibold tracking-tight text-[#03002C]">{value}</div>
      <div className="mt-1 text-[12px] text-black/60">{label}</div>
    </div>
  );
}

function factLine(facts: Record<string, unknown>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(facts)) {
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(value)}`);
  }
  return parts.slice(0, 8).join(" · ");
}

function HitCard({ hit }: { hit: EventKnowledgeHit }) {
  const facts = factLine(hit.facts);
  return (
    <article className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_TONES[hit.kind]}`}
        >
          {KIND_LABELS[hit.kind]}
        </span>
        <span className="text-[11px] text-black/50">
          {hit.city} · {hit.venue}
        </span>
        <span className="ml-auto text-[11px] tabular-nums text-black/45">
          {Math.round(hit.similarity * 100)}% match
        </span>
      </div>
      <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-[#03002C]">{hit.title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-[1.5] text-black/70">
        {hit.body}
      </p>
      {facts ? <p className="mt-2 text-[11.5px] text-black/50">{facts}</p> : null}
    </article>
  );
}

function KnowledgePage() {
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState<EventKnowledgeKind | "">("");
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const queryClient = useQueryClient();

  const coverageFn = useServerFn(eventKnowledgeCoverage);
  const searchFn = useServerFn(searchEventKnowledge);
  const syncFn = useServerFn(syncEventKnowledge);
  const backlogFn = useServerFn(embedEventKnowledgeBacklog);

  const coverage = useQuery({
    queryKey: ["event-knowledge", "coverage"],
    queryFn: () => coverageFn(),
  });

  const search = useMutation({
    mutationFn: (input: { question: string; kind: EventKnowledgeKind | "" }) =>
      searchFn({ data: { question: input.question, kind: input.kind || null } }),
  });

  // Harvesting a whole venue outlives one request, so it runs in resumable
  // slices and each slice is written before the next starts.
  const sync = useMutation({
    mutationFn: async () => {
      let offset = 0;
      let total = 0;
      let written = 0;
      let embedded = 0;
      let pendingRows = 0;
      const failures: string[] = [];
      for (let pass = 0; pass < 200; pass += 1) {
        const step = await syncFn({ data: { offset } });
        total = step.total;
        written += step.written;
        embedded += step.embedded;
        pendingRows += step.pending;
        failures.push(...step.failures);
        offset = step.offset;
        setSyncProgress({ done: offset, total });
        queryClient.invalidateQueries({ queryKey: ["event-knowledge", "coverage"] });
        if (step.done) break;
      }
      return { total, written, embedded, pending: pendingRows, failures };
    },
    onSettled: () => {
      setSyncProgress(null);
      queryClient.invalidateQueries({ queryKey: ["event-knowledge", "coverage"] });
    },
  });

  const backlog = useMutation({
    mutationFn: () => backlogFn(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event-knowledge", "coverage"] }),
  });

  const totals = useMemo(() => {
    const cities = coverage.data?.cities ?? [];
    return {
      records: cities.reduce((sum, c) => sum + c.total, 0),
      embedded: cities.reduce((sum, c) => sum + c.embedded, 0),
      cities: cities.length,
    };
  }, [coverage.data]);

  const pending = totals.records - totals.embedded;
  const brief = search.data?.brief;
  const ordered = brief
    ? [...brief.specs, ...brief.placement, ...brief.lessons, ...brief.other]
    : [];

  function ask(next: string) {
    setQuestion(next);
    if (next.trim().length >= 3) search.mutate({ question: next, kind });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/events/next"
            className="inline-flex items-center gap-1.5 text-xs text-black/55 hover:text-[#003FC7]"
          >
            <ArrowLeft size={13} /> NEXT 2026 hub
          </Link>
          <Link
            to="/events/next/playbook"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#003FC7] hover:underline"
          >
            <BookOpen size={13} /> Venue playbook
          </Link>
        </div>

        <div className="mt-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E0E8F5] px-2.5 py-1 text-[11px] font-medium text-[#003FC7]">
            <Brain size={12} /> Event knowledge
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#03002C]">
            Ask what past venues taught
          </h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-[1.5] text-black/70">
            Every measured face, template family, approved ground, build lesson and shipped live
            file from {LONDON_VENUE.venue} is searchable here in plain language. Sizes and
            placements come back as precedent to sanity-check against — a new venue still confirms
            them on survey.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${totals.records}`} label="Things the build has learned" />
          <Stat value={`${totals.embedded}`} label="Searchable right now" />
          <Stat value={`${pending}`} label="Captured, waiting to be indexed" />
          <Stat value={`${totals.cities}`} label="Venues contributing" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <Loader2 size={13} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={13} className="mr-1.5" />
            )}
            Learn from this event
          </Button>
          {syncProgress ? (
            <span className="text-[12px] tabular-nums text-black/60">
              {syncProgress.done} of {syncProgress.total} learned
            </span>
          ) : null}
          {pending > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => backlog.mutate()}
              disabled={backlog.isPending}
            >
              {backlog.isPending ? (
                <Loader2 size={13} className="mr-1.5 animate-spin" />
              ) : null}
              Index the {pending} waiting
            </Button>
          ) : null}
          {sync.data ? (
            <span className="text-[12px] text-black/60">
              {sync.data.written} recorded · {sync.data.embedded} indexed
              {sync.data.pending ? ` · ${sync.data.pending} still waiting` : ""}
            </span>
          ) : null}
        </div>

        {/* Failures are shown, never swallowed: an unindexed record cannot be found. */}
        {(sync.data?.failures.length || backlog.data?.failures.length) ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FF9B70] bg-[#FF9B70]/15 p-3 text-[12.5px] text-[#03002C]">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <div>
              Some records could not be indexed and will not appear in search yet:{" "}
              {[...(sync.data?.failures ?? []), ...(backlog.data?.failures ?? [])].join(" · ")}
            </div>
          </div>
        ) : null}
        {sync.error || backlog.error ? (
          <p className="mt-3 text-[12.5px] text-[#E53D2E]">
            {(sync.error ?? backlog.error) instanceof Error
              ? ((sync.error ?? backlog.error) as Error).message
              : "That could not be completed."}
          </p>
        ) : null}

        <form
          className="mt-8 rounded-2xl border border-black/10 bg-[#EEF1F7] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim().length >= 3) search.mutate({ question, kind });
          }}
        >
          <label htmlFor="knowledge-question" className="text-[12px] font-medium text-[#03002C]">
            What do you need to know?
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="knowledge-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. how were the lift wraps trimmed and what bleed did they carry?"
              className="min-w-[280px] flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-[14px] text-[#03002C] outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
            />
            <select
              aria-label="Limit to one kind of knowledge"
              value={kind}
              onChange={(event) => setKind(event.target.value as EventKnowledgeKind | "")}
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] text-[#03002C] outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
            >
              <option value="">Everything</option>
              {(Object.keys(KIND_LABELS) as EventKnowledgeKind[]).map((value) => (
                <option key={value} value={value}>
                  {KIND_LABELS[value]}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={search.isPending}>
              {search.isPending ? (
                <Loader2 size={13} className="mr-1.5 animate-spin" />
              ) : (
                <Search size={13} className="mr-1.5" />
              )}
              Ask
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => ask(example)}
                className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11.5px] text-black/65 hover:border-[#003FC7] hover:text-[#003FC7]"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {search.error ? (
          <p className="mt-4 text-[13px] text-[#E53D2E]">
            {search.error instanceof Error ? search.error.message : "That search could not run."}
          </p>
        ) : null}

        {search.data ? (
          ordered.length ? (
            <div className="mt-6 space-y-3">
              <p className="text-[12px] text-black/55">
                {ordered.length} close {ordered.length === 1 ? "match" : "matches"}
                {brief?.specs.length
                  ? ` · ${brief.specs.length} measured ${brief.specs.length === 1 ? "spec" : "specs"}`
                  : ""}
                {brief?.lessons.length ? ` · ${brief.lessons.length} lessons` : ""}
              </p>
              {ordered.map((hit) => (
                <HitCard key={hit.id} hit={hit} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 text-[13.5px] text-black/65">
              Nothing in the store is close enough to answer that yet. If the answer exists in this
              build, run “Learn from this event” to re-harvest — and if it was a judgement call, add
              it to the lessons log so it is here next time.
            </div>
          )
        ) : null}

        {coverage.data?.cities.length ? (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-black/50">
              Coverage by venue
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {coverage.data.cities.map((city) => (
                <div key={city.city} className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-semibold tracking-tight text-[#03002C]">
                      {city.city}
                    </h3>
                    <span className="text-[11.5px] text-black/50">
                      {city.embedded}/{city.total} searchable
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(city.kinds)
                      .sort((a, b) => b[1] - a[1])
                      .map(([value, count]) => (
                        <span
                          key={value}
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            KIND_TONES[value as EventKnowledgeKind] ?? "bg-[#F2F2F2] text-[#03002C]"
                          }`}
                        >
                          {KIND_LABELS[value as EventKnowledgeKind] ?? value} · {count}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
