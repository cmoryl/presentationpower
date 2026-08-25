import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  Gauge,
  ListChecks,
  Presentation,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  JUDGING_CATEGORIES,
  JUDGING_DECK_OUTLINE,
  JUDGING_DEMO_DECK,
  JUDGING_RUN_OF_SHOW,
  JUDGING_SCRIPT,
} from "@/lib/judging-demo";
import { useDeckStore } from "@/lib/deck-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo/judging")({
  head: () => ({
    meta: [
      { title: "Markathon demo prep · TransPerfect Element" },
      {
        name: "description",
        content:
          "A three-minute Markathon demo checklist, script, and judging-ready deck outline for TransPerfect Element.",
      },
      { property: "og:title", content: "Markathon demo prep · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Run the Element live demo against the Markathon judging sheet: sell more, automate and innovate, and scale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://transperfectelement.lovable.app/demo/judging" }],
  }),
  component: JudgingDemoPrepPage,
});

const CHECKLIST_STORAGE_KEY = "element:markathon-judging-checklist";
const allCriteria = JUDGING_CATEGORIES.flatMap((category) => category.criteria);
const totalCriteria = allCriteria.length;

function JudgingDemoPrepPage() {
  const navigate = useNavigate();
  const createDeckFromSnapshot = useDeckStore((state) => state.createDeckFromSnapshot);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      const next: Record<string, boolean> = {};
      for (const criterion of allCriteria) {
        next[criterion.id] = parsed[criterion.id] === true;
      }
      setChecked(next);
    } catch {
      setChecked({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* ignore local persistence failures */
    }
  }, [checked]);

  const completed = useMemo(
    () => allCriteria.reduce((count, criterion) => count + (checked[criterion.id] ? 1 : 0), 0),
    [checked],
  );

  function toggleCriterion(id: string, value: boolean) {
    setChecked((current) => ({ ...current, [id]: value }));
  }

  function createJudgingDeck() {
    const { deckId } = createDeckFromSnapshot(JUDGING_DEMO_DECK);
    void navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-primary text-primary-foreground">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.65fr] lg:p-10">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase text-primary-foreground/75">
                <Trophy className="size-4" aria-hidden /> The Markathon
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Three-minute judging runbook
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-primary-foreground/75">
                A live-demo prep surface mapped directly to the score sheet: sell more, automate and innovate, and scale.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button type="button" variant="secondary" size="lg" onClick={createJudgingDeck}>
                  <Sparkles className="size-4" aria-hidden /> Create judging deck
                </Button>
                <Button asChild variant="outline" size="lg" className="border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Link to="/agent">
                    Open Deck agent <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary-foreground text-primary">
                  <Gauge className="size-6" aria-hidden />
                </div>
                <div>
                  <div className="text-sm font-medium text-primary-foreground/70">Checklist complete</div>
                  <div className="text-3xl font-semibold tracking-tight">
                    {completed}/{totalCriteria}
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-lg bg-primary-foreground/10 p-4 text-sm leading-relaxed text-primary-foreground/80">
                Final score = Sell more x5 + Automate & innovate x4 + Scale x3 = /180.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {JUDGING_CATEGORIES.map((category) => {
            const completeInCategory = category.criteria.filter((criterion) => checked[criterion.id]).length;
            return (
              <article key={category.id} className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-primary">Weight x{category.weight}</div>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">{category.label}</h2>
                  </div>
                  <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-semibold text-muted-foreground">
                    {completeInCategory}/3
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{category.proofLine}</p>
                <div className="mt-5 space-y-3">
                  {category.criteria.map((criterion) => {
                    const active = checked[criterion.id] === true;
                    return (
                      <label
                        key={criterion.id}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-xl border p-3 transition",
                          active
                            ? "border-primary/35 bg-primary/5"
                            : "border-border bg-background hover:border-primary/30",
                        )}
                      >
                        <Checkbox
                          checked={active}
                          onCheckedChange={(value) => toggleCriterion(criterion.id, value === true)}
                          aria-label={`Mark ${criterion.label} as covered`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{criterion.label}</span>
                          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                            {criterion.demoMove}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
              <ListChecks className="size-4" aria-hidden /> Live run-of-show
            </div>
            <div className="mt-5 space-y-4">
              {JUDGING_RUN_OF_SHOW.map((step) => (
                <div key={step.time} className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[8rem_1fr]">
                  <div className="text-sm font-semibold text-primary">{step.time}</div>
                  <div className="min-w-0">
                    <h3 className="font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.action}</p>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{step.judgeSignal}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
              <FileText className="size-4" aria-hidden /> Talk track
            </div>
            <div className="mt-5 space-y-3">
              {JUDGING_SCRIPT.map((beat) => (
                <div key={beat.time} className="rounded-xl bg-muted p-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{beat.time}</div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{beat.speakerLine}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase text-primary">
                <Presentation className="size-4" aria-hidden /> Judging-ready deck structure
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Uses the approved Enterprise brand system by default with a deliberate light and dark slide mix.
              </p>
            </div>
            <Button type="button" onClick={createJudgingDeck}>
              Create editable deck <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {JUDGING_DECK_OUTLINE.map((slide, index) => (
              <article key={slide.title} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{slide.mode}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-snug">{slide.title}</h3>
                <div className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{slide.module}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{slide.purpose}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Link to="/agent" className="group rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition hover:border-primary/35">
            <Rocket className="size-8 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Start from the agent</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Create the live deck from a judging-specific prompt.</p>
          </Link>
          <Link to="/library" className="group rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition hover:border-primary/35">
            <ShieldCheck className="size-8 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Show approved modules</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Prove scale through reusable, governed slide systems.</p>
          </Link>
          <Link to="/library/print" className="group rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition hover:border-primary/35">
            <ClipboardCheck className="size-8 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Jump to multi-channel</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Connect the story to print, social, and event production.</p>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

