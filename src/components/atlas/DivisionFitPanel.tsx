import { useMemo, useState } from "react";
import {
  planDivisionFit,
  demoSlideBriefs,
  sectionSequence,
} from "@/lib/division-fit-engine";
import { NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";
import { DIVISION_DESIGN_SPECS } from "@/lib/division-design-specs";

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
