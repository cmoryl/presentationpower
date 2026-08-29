import { useEffect, useMemo, useState } from "react";
import {
  planDivisionFit,
  demoSlideBriefs,
  sectionSequence,
} from "@/lib/division-fit-engine";
import { NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";
import { DIVISION_DESIGN_SPECS } from "@/lib/division-design-specs";
import { buildDivisionRun, runDivisionStages, type DivisionRunReport } from "@/lib/division-run";
import {
  createDeckFromDivisionRun,
  createDeckFromBuiltStages,
  walkDeckAgainstSpec,
  type DeckWalkReport,
} from "@/lib/division-deck-run";
import { DeckApprovalPanel } from "@/components/atlas/DeckApprovalPanel";
import { useDeckStore } from "@/lib/deck-store";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";


// The stage graph (VariantRenderer + every module family) is large and only
// needed once the reviewer asks to see the built slides, so it is code-split
// away from the Atlas page shell.
const ScaledSlide = lazy(() =>
  import("@/components/slide/ScaledSlide").then((m) => ({ default: m.ScaledSlide })),
);
const ExactSlideStage = lazy(() =>
  import("@/components/slide/ExactSlideStage").then((m) => ({ default: m.ExactSlideStage })),
);

declare global {
  interface Window {
    __tpDivisionRun?: {
      run: (opts?: { brandModeId?: string; archetypeId?: string }) => Promise<DivisionRunReport>;
      buildDeck: (opts?: {
        brandModeId?: string;
        archetypeId?: string;
      }) => Promise<DeckWalkReport>;
    };
  }
}

export function DivisionFitPanel({ ink }: { ink: string }) {
  const [brandModeId, setBrandModeId] = useState("bm-enterprise");
  const [archetypeId, setArchetypeId] = useState(NARRATIVE_ARCHETYPES[0]?.id ?? "");
  const [blocks, setBlocks] = useState(4);
  const [copy, setCopy] = useState<"short" | "medium" | "long">("medium");
  const [media, setMedia] = useState(true);
  const [rhythmWindow, setRhythmWindow] = useState(3);

  const plan = useMemo(() => {
    const sections = sectionSequence(archetypeId);
    return planDivisionFit({
      brandModeId,
      rhythmWindow,
      slides: demoSlideBriefs(sections, { blocks, copy, media }),
    });
  }, [brandModeId, archetypeId, blocks, copy, media, rhythmWindow]);

  // Building is separate from planning on purpose: mounting a full run of
  // 1920×1080 stages is expensive, so it happens on demand and the result is
  // held against the plan that produced it.
  const [report, setReport] = useState<DivisionRunReport | null>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [previews, setPreviews] = useState(false);
  // Materialised deck + the walk taken from that saved deck.
  const [walk, setWalk] = useState<DeckWalkReport | null>(null);
  const [walking, setWalking] = useState<{ done: number; total: number } | null>(null);
  // Deck materialised straight from the live stage graph on screen.
  const [staged, setStaged] = useState<{ deckId: string; title: string; slides: number } | null>(
    null,
  );

  const built = useMemo(() => (previews ? buildDivisionRun(plan) : []), [plan, previews]);

  useEffect(() => {
    setReport(null);
    setWalk(null);
    setStaged(null);
  }, [plan]);

  // Build the run into a real deck, then walk the SAVED deck back against the
  // spec — deck creation runs the QA auto-fixer, so the deck is not always the
  // plan and only a deck-side walk can prove it.
  async function buildDeckAndWalk() {
    const { deck } = createDeckFromDivisionRun(plan, { archetypeId });
    setWalking({ done: 0, total: deck.slides.length });
    try {
      const out = await walkDeckAgainstSpec(deck, plan, {
        onProgress: (done, total) => setWalking({ done, total }),
      });
      setWalk(out);
      return out;
    } finally {
      setWalking(null);
    }
  }

  // LIVE STAGE → DECK: save exactly the stages already mounted on screen. No
  // second arbitration or build pass, so the deck cannot drift from what the
  // reviewer is looking at.
  function materialiseStages() {
    const stages = built.length > 0 ? built : buildDivisionRun(plan);
    const { deck } = createDeckFromBuiltStages(plan, stages, { archetypeId });
    setStaged({ deckId: deck.id, title: deck.title, slides: deck.slides.length });
    return deck;
  }

  async function walkStagedDeck() {
    const deck = staged ? (useDeckStore.getState().decks[staged.deckId] ?? null) : null;
    const target = deck ?? materialiseStages();
    setWalking({ done: 0, total: target.slides.length });
    try {
      const out = await walkDeckAgainstSpec(target, plan, {
        onProgress: (done, total) => setWalking({ done, total }),
      });
      setWalk(out);
      return out;
    } finally {
      setWalking(null);
    }
  }


  async function build() {
    setBusy({ done: 0, total: plan.slides.length });
    try {
      const out = await runDivisionStages(plan, {
        onProgress: (done, total) => setBusy({ done, total }),
      });
      setReport(out);
      return out;
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    window.__tpDivisionRun = {
      run: async (opts) => {
        const sections = sectionSequence(opts?.archetypeId ?? archetypeId);
        const p = planDivisionFit({
          brandModeId: opts?.brandModeId ?? brandModeId,
          rhythmWindow,
          slides: demoSlideBriefs(sections, { blocks, copy, media }),
        });
        const out = await runDivisionStages(p);
        setReport(out);
        return out;
      },
      buildDeck: async (opts) => {
        const sections = sectionSequence(opts?.archetypeId ?? archetypeId);
        const p = planDivisionFit({
          brandModeId: opts?.brandModeId ?? brandModeId,
          rhythmWindow,
          slides: demoSlideBriefs(sections, { blocks, copy, media }),
        });
        const { deck } = createDeckFromDivisionRun(p, { archetypeId: opts?.archetypeId ?? archetypeId });
        const out = await walkDeckAgainstSpec(deck, p);
        setWalk(out);
        return out;
      },
    };
    return () => {
      delete window.__tpDivisionRun;
    };
  }, [archetypeId, brandModeId, rhythmWindow, blocks, copy, media]);

  const auditByIndex = useMemo(() => {
    const map = new Map<number, DivisionRunReport["slides"][number]>();
    for (const s of report?.slides ?? []) map.set(s.index, s);
    return map;
  }, [report]);

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-black/60">
        A deck is not a bag of slides. This engine plans a whole run for one brand scope: every slide
        is arbitrated with the division's own spec (approved light/dark packs, ground recipe,
        conformance set) plus the winners of the previous slides as neighbour context, so rhythm is
        earned across the sequence instead of inside a single card.
      </p>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-3">
        <Field label="Brand scope">
          <select
            value={brandModeId}
            onChange={(e) => setBrandModeId(e.target.value)}
            className="w-full rounded-lg border border-black/12 px-2 py-1.5 text-sm"
            aria-label="Brand scope"
          >
            {Object.keys(DIVISION_DESIGN_SPECS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Narrative archetype">
          <select
            value={archetypeId}
            onChange={(e) => setArchetypeId(e.target.value)}
            className="w-full rounded-lg border border-black/12 px-2 py-1.5 text-sm"
            aria-label="Narrative archetype"
          >
            {NARRATIVE_ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Copy length">
          <select
            value={copy}
            onChange={(e) => setCopy(e.target.value as typeof copy)}
            className="w-full rounded-lg border border-black/12 px-2 py-1.5 text-sm"
            aria-label="Copy length"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </Field>

        <Field label={`Blocks per slide · ${blocks}`}>
          <input
            type="range"
            min={1}
            max={12}
            value={blocks}
            onChange={(e) => setBlocks(Number(e.target.value))}
            className="w-full"
            aria-label="Blocks per slide"
          />
        </Field>

        <Field label={`Rhythm window · ${rhythmWindow}`}>
          <input
            type="range"
            min={0}
            max={6}
            value={rhythmWindow}
            onChange={(e) => setRhythmWindow(Number(e.target.value))}
            className="w-full"
            aria-label="Rhythm window"
          />
        </Field>

        <Field label="Media">
          <label className="flex items-center gap-2 text-sm text-black/65">
            <input type="checkbox" checked={media} onChange={(e) => setMedia(e.target.checked)} />
            Charts and imagery in the brief
          </label>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Layout variety" value={`${(plan.variety * 100).toFixed(0)}%`} ink={ink} />
        <Stat label="Mean score" value={plan.meanScore.toFixed(3)} ink={ink} />
        <Stat label="Off-spec slides" value={String(plan.offSpecCount)} ink={ink} />
        <Stat label="Combos scored" value={plan.totalConsidered.toLocaleString()} ink={ink} />
      </div>

      <ul className="space-y-1 text-sm text-black/65">
        {plan.findings.map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>

      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void build()}
            disabled={Boolean(busy)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: ink }}
          >
            {busy ? `Building ${busy.done}/${busy.total}…` : "Build the slides & compare to spec"}
          </button>
          <button
            type="button"
            onClick={() => void buildDeckAndWalk()}
            disabled={Boolean(busy || walking)}
            className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: `${ink}33`, color: ink }}
          >
            {walking
              ? `Walking deck ${walking.done}/${walking.total}…`
              : "Build into a deck & walk each slide"}
          </button>
          <label className="flex items-center gap-2 text-sm text-black/65">
            <input
              type="checkbox"
              checked={previews}
              onChange={(e) => setPreviews(e.target.checked)}
            />
            Show built stages
          </label>
          {report && (
            <span className="text-sm text-black/60">
              {report.passCount}/{report.builtCount} stages match the spec
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-xs text-black/50">
          Each winner is seeded with real division content and mounted on the canonical 1920×1080
          export stage, then measured: rendered module, approved pack, planned face, pack surface
          token, readability guard, content plane and stage overflow.
        </p>
        {report && report.problems.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-black/65">
            {report.problems.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        )}
      </div>

      {walk && (
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold" style={{ color: ink }}>
              Saved deck walk — {walk.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-black/60">
              <span>
                {walk.passCount}/{walk.slides.length} deck slides match spec
              </span>
              <Link
                to="/decks/$deckId"
                params={{ deckId: walk.deckId }}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium"
                style={{ borderColor: `${ink}33`, color: ink }}
              >
                Open the deck
              </Link>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-black/65">
            {walk.findings.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-black/45 uppercase tracking-widest">
                <tr>
                  <th className="py-1.5 pr-3">#</th>
                  <th className="py-1.5 pr-3">Section</th>
                  <th className="py-1.5 pr-3">Module on the sheet</th>
                  <th className="py-1.5 pr-3">Face · pack</th>
                  <th className="py-1.5 pr-3">Origin</th>
                  <th className="py-1.5">Stage vs spec</th>
                </tr>
              </thead>
              <tbody className="text-black/65">
                {walk.slides.map((s) => (
                  <tr key={s.slideId} className="border-t border-black/10 align-top">
                    <td className="py-2 pr-3 font-mono">{s.position + 1}</td>
                    <td className="py-2 pr-3">{s.sectionId}</td>
                    <td className="py-2 pr-3 font-mono">{s.variantId}</td>
                    <td className="py-2 pr-3 font-mono">
                      {s.face} · {s.packId}
                    </td>
                    <td className="py-2 pr-3">
                      {s.planned ? (
                        <Chip tone="ok">planned</Chip>
                      ) : (
                        <Chip tone="warn">
                          {s.plannedVariantId ? `swapped from ${s.plannedVariantId}` : "added by QA"}
                        </Chip>
                      )}
                    </td>
                    <td className="py-2">
                      {s.ok ? (
                        <Chip tone="ok">{s.entries} elements measured</Chip>
                      ) : (
                        <span className="text-[#A33B12]">{s.problems.join("; ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {previews && built.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {built.map((item) => (
            <div
              key={`built-${item.plan.index}`}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white"
            >
              <Suspense fallback={<div className="aspect-[16/9] w-full bg-black/5" />}>
                <ScaledSlide>
                <ExactSlideStage
                  slide={item.slide}
                  variant={item.variant}
                  brand={item.brand}
                  mode={item.mode}
                  pack={item.pack}
                  industryId={item.plan.recipe}
                  pageNumber={item.plan.index + 1}
                />
                </ScaledSlide>
              </Suspense>
              <div className="flex items-baseline justify-between px-4 py-2 font-mono text-[11px] text-black/50">
                <span>
                  {item.plan.index + 1}. {item.variant.id}
                </span>
                <span>
                  {item.plan.packId} · {item.mode}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plan.slides.map((slide) => (
          <div
            key={`${slide.index}-${slide.sectionId}`}
            className="rounded-2xl border border-black/10 bg-white p-5"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs text-black/50">
                {slide.index + 1}. {slide.sectionId}
              </span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] uppercase tracking-wider text-black/55">
                {slide.face}
              </span>
            </div>
            <div className="mt-1 font-medium">{slide.sectionName}</div>

            {slide.best ? (
              <>
                <div className="mt-3 text-xs uppercase tracking-widest" style={{ color: ink }}>
                  Recommended
                </div>
                <div className="font-mono text-sm">{slide.best.variantId}</div>
                <div className="text-sm text-black/65">{slide.best.name}</div>

                <dl className="mt-3 space-y-1 text-xs text-black/55">
                  <div>
                    Level {slide.best.level} · layout {slide.best.layoutId} · score{" "}
                    <span className="font-mono">{slide.best.score.toFixed(3)}</span>
                  </div>
                  <div>
                    Sizing {slide.canvas.aspect} · fill bias{" "}
                    <span className="font-mono">{slide.canvas.fillBias.toFixed(2)}</span> ·{" "}
                    {slide.canvas.suggestedSlides} sheet
                    {slide.canvas.suggestedSlides === 1 ? "" : "s"}
                  </div>
                  <div>
                    Spec pack <span className="font-mono">{slide.packId}</span> · recipe{" "}
                    <span className="font-mono">{slide.recipe ?? "—"}</span>
                  </div>
                  <div>
                    Rhythm axis{" "}
                    <span className="font-mono">{slide.best.breakdown.rhythm.toFixed(2)}</span> ·
                    neighbours {slide.neighbours.length ? slide.neighbours.join(", ") : "none"}
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone={slide.inSpec ? "ok" : "warn"}>
                    {slide.inSpec ? "in conformance set" : "off spec"}
                  </Chip>
                  {slide.canvas.splitRecommended && (
                    <Chip tone="warn">split × {slide.canvas.suggestedSlides}</Chip>
                  )}
                  {!slide.best.feasible && <Chip tone="warn">no exact fit</Chip>}
                </div>

                {slide.notes.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs leading-relaxed text-black/50">
                    {slide.notes.slice(0, 3).map((n) => (
                      <li key={n}>— {n}</li>
                    ))}
                  </ul>
                )}

                {(() => {
                  const audit = auditByIndex.get(slide.index);
                  if (!audit) return null;
                  return (
                    <div className="mt-4 border-t border-black/10 pt-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-black/45">
                        <span>Built stage</span>
                        <Chip tone={audit.ok ? "ok" : "warn"}>
                          {audit.ok ? "matches spec" : "drift"}
                        </Chip>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-black/55">
                        {audit.checks.map((c) => (
                          <li key={c.id}>
                            {c.ok ? "✓" : "✕"} {c.label} · <span className="font-mono">{c.detail}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 font-mono text-[11px] text-black/40">
                        {audit.entries} measured elements · digest {audit.digest ?? "—"}
                        {audit.error ? ` · ${audit.error}` : ""}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="mt-3 text-sm text-black/50">
                No legal module holds this brief for {slide.sectionId}.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs uppercase tracking-widest text-black/45">{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, ink }: { label: string; value: string; ink: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-xs uppercase tracking-widest text-black/45">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: ink }}>
        {value}
      </div>
    </div>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  const style =
    tone === "warn"
      ? { backgroundColor: "#A33B1214", color: "#A33B12" }
      : { backgroundColor: "#0F5C1A14", color: "#0F5C1A" };
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px]" style={style}>
      {children}
    </span>
  );
}
