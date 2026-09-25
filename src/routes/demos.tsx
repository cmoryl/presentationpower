// /demos — the one entrance for showing this build to an audience.
//
// Four scripted run-throughs, each about four minutes, on real pages. The
// script (what to say, what to click, what the audience keeps) lives in
// src/lib/demo-runs.ts so the page never drifts from the story.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, Check, Copy, ShieldAlert, Clock, Gift, Play, Wand2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import {
  DEMO_OPENER,
  DEMO_PROOF_POINTS,
  DEMO_RUNS,
  demoRunMinutes,
  type DemoRun,
} from "@/lib/demo-runs";

export const Route = createFileRoute("/demos")({
  head: () => {
    const title = "Demo run-throughs · TransPerfect Element";
    const description =
      "Four scripted, four-minute demos on real pages: the sales pitch, press-ready print, event signage, and translation with governed terminology.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: DemosPage,
});

function CopyPrompt({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : "Copy the sentence"}
    </button>
  );
}

/** Demo recording that only starts when the viewer presses play. */
function DemoVideo({ id, name }: { id: string; name: string }) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-xl border border-black/10 bg-[#EEF1F7] dark:border-white/15">
      <video
        ref={ref}
        className="h-full w-full object-cover object-top"
        src={`/demos/${id}.mp4?v=flow1`}
        poster={`/demos/${id}.jpg`}
        playsInline
        preload="none"
        controls={started}
        aria-label={`Screen recording: ${name}`}
      />
      {!started ? (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            void ref.current?.play();
          }}
          aria-label={`Play demo: ${name}`}
          className="group absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#003FC7]"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#03002C] text-white shadow-lg transition-transform group-hover:scale-105 motion-reduce:transition-none">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

function RunCard({ run }: { run: DemoRun }) {
  const [open, setOpen] = useState(false);
  const minutes = demoRunMinutes(run);
  const first = run.steps[0];
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/[0.04]">
      {/* Screen recording of this run on the real pages (public/demos). */}
      <DemoVideo id={run.id} name={run.name} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[16rem]">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#003FC7] uppercase">
            {run.audience}
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight">{run.name}</h2>
          <p className="mt-2 max-w-xl text-sm text-black/70 dark:text-white/70">{run.claim}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
          <Clock className="h-3.5 w-3.5" />
          about {minutes} min
        </span>
      </div>

      <p className="mt-4 border-l-2 border-[#003FC7] pl-3 text-sm italic text-black/75 dark:text-white/75">
        “{run.opener}”
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={DEMO_OPENER.to}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#03002C] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#003FC7]"
        >
          Start with the live build
          <ArrowRight className="h-4 w-4" />
        </Link>
        {first ? (
          <Link
            to={first.to}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Skip to step 1
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl px-2.5 py-2 text-sm font-medium text-[#003FC7] hover:underline"
        >
          {open ? "Hide the script" : `Show the script (${run.steps.length} steps)`}
        </button>
      </div>

      {open ? (
        <ol className="mt-5 space-y-3">
          {run.steps.map((step, i) => (
            <li
              key={`${run.id}-${i}`}
              className="rounded-xl border border-black/10 p-4 dark:border-white/12"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">
                  {i + 1}. {step.does}
                </p>
                <span className="text-[11px] text-black/50 dark:text-white/50">
                  ~{step.seconds}s
                </span>
              </div>
              <p className="mt-1.5 text-sm italic text-black/70 dark:text-white/70">“{step.say}”</p>
              {step.proof ? (
                <p className="mt-2 flex gap-2 rounded-lg bg-[#FFEB66]/30 p-2.5 text-xs text-black/80 dark:bg-[#FFEB66]/10 dark:text-white/80">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong className="font-semibold">The moment:</strong> {step.proof}
                  </span>
                </p>
              ) : null}
              <Link
                to={step.to}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#003FC7] hover:underline"
              >
                Open this page
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="flex gap-2 text-xs text-black/70 dark:text-white/70">
          <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#003FC7]" />
          <span>
            <strong className="font-semibold">They keep:</strong> {run.keeps}
          </span>
        </p>
        <p className="flex gap-2 text-xs text-black/70 dark:text-white/70">
          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#003FC7]" />
          <span>
            <strong className="font-semibold">Make it theirs:</strong> {run.personalise}
          </span>
        </p>
      </div>
    </section>
  );
}

function DemosPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#003FC7] uppercase">Demos</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Four run-throughs, four minutes each
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-black/65 dark:text-white/65">
            One place to start a demo, so nobody hunts for a link mid-meeting. Every run happens on
            real pages with real output — and every run has one moment where the system refuses
            something out loud, which is the part people remember.
          </p>
        </header>

        <div className="mt-8 rounded-2xl bg-[#03002C] p-6 text-white">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#A1FBF9] uppercase">
            Always open here
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Build it while they watch</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/75">{DEMO_OPENER.claim}</p>
          <p className="mt-4 rounded-xl border border-white/20 bg-white/5 p-3 font-mono text-sm">
            {DEMO_OPENER.prompt}
          </p>
          <p className="mt-2 text-xs italic text-white/65">“{DEMO_OPENER.say}”</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              to={DEMO_OPENER.to}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-[#03002C] hover:bg-[#E0E8F5]"
            >
              Open the builder
              <ArrowRight className="h-4 w-4" />
            </Link>
            <CopyPrompt text={DEMO_OPENER.prompt} />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DEMO_PROOF_POINTS.map((p) => (
            <div
              key={p.label}
              className="rounded-xl border border-black/10 p-3.5 dark:border-white/15"
            >
              <p className="text-xl font-semibold tracking-tight text-[#003FC7]">{p.figure}</p>
              <p className="mt-1 text-[11px] leading-snug text-black/65 dark:text-white/65">
                {p.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-5">
          {DEMO_RUNS.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>

        <p className="mt-10 text-xs text-black/55 dark:text-white/55">
          Put the prospect’s own name, division and market into the brief before you start — a demo
          about them lands differently from a demo about a sample client.
        </p>
      </div>
    </AppShell>
  );
}
