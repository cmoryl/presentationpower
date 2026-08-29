import { useMemo, useState } from "react";
import { arbitrateLayout, type LayoutBrief } from "@/lib/layout-arbiter";
import { SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { INDUSTRY_RECIPES } from "@/lib/design-skins";
import { DIVISION_DESIGN_SPECS } from "@/lib/division-design-specs";

const ASPECTS: Array<{ id: string; label: string; canvas: { width: number; height: number } }> = [
  { id: "16:9", label: "16:9", canvas: { width: 16, height: 9 } },
  { id: "16:10", label: "16:10", canvas: { width: 16, height: 10 } },
  { id: "4:3", label: "4:3", canvas: { width: 4, height: 3 } },
];

const COPY = {
  short: {
    title: "Proof the programme paid back",
    body: "Measured against the FY baseline.",
  },
  medium: {
    title: "Proof the programme paid back inside two quarters",
    body: "Measured against the FY baseline across four markets, with localisation throughput and review cycles held constant.",
  },
  long: {
    title: "Proof the programme paid back inside two quarters across every regulated market we entered",
    body: "Measured against the FY baseline across four markets, with localisation throughput, review cycles and downstream rework all held constant so the delta is attributable to the programme itself rather than to seasonal demand or headcount changes in the regional teams.",
  },
} as const;

type CopyLength = keyof typeof COPY;

export function ArbiterLab({ ink }: { ink: string }) {
  const [aspectId, setAspectId] = useState("16:9");
  const [blocks, setBlocks] = useState(4);
  const [copyLength, setCopyLength] = useState<CopyLength>("medium");
  const [hasChart, setHasChart] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const [industryId, setIndustryId] = useState("R01");
  const [brandModeId, setBrandModeId] = useState("bm-enterprise");

  const aspect = ASPECTS.find((a) => a.id === aspectId) ?? ASPECTS[0];

  const brief = useMemo<Omit<LayoutBrief, "sectionId">>(
    () => ({
      industryId,
      brandModeId,
      canvas: aspect.canvas,
      content: {
        title: COPY[copyLength].title,
        body: COPY[copyLength].body,
        items: Array.from({ length: blocks }, (_, i) => i),
        hasChart,
        hasImage,
      },
    }),
    [industryId, brandModeId, aspect, copyLength, blocks, hasChart, hasImage],
  );

  const decisions = useMemo(
    () =>
      SECTION_FRAMEWORKS.map((sf) => ({
        sf,
        decision: arbitrateLayout({ ...brief, sectionId: sf.id }),
      })),
    [brief],
  );

  const considered = decisions.reduce((n, d) => n + d.decision.consideredCount, 0);

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-sm text-black/60">
        The assembler no longer takes the first permitted layout. Change the brief below and every
        section card re-arbitrates live: each one enumerates its legal module × layout × reading
        level combinations, prunes what the authored content cannot hold, and reports the winner with
        its sizing guidance.
      </p>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-black/10 bg-white p-5 md:grid-cols-3">
        <Field label="Canvas">
          <div className="flex gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspectId(a.id)}
                className="rounded-full border px-3 py-1 text-xs transition-colors"
                style={
                  a.id === aspectId
                    ? { backgroundColor: ink, borderColor: ink, color: "#fff" }
                    : { borderColor: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.6)" }
                }
                aria-pressed={a.id === aspectId}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Content blocks · ${blocks}`}>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={blocks}
            onChange={(e) => setBlocks(Number(e.target.value))}
            className="w-full"
            aria-label="Content blocks"
          />
        </Field>

        <Field label="Copy length">
          <select
            value={copyLength}
            onChange={(e) => setCopyLength(e.target.value as CopyLength)}
            className="w-full rounded-lg border border-black/12 px-2 py-1.5 text-sm"
            aria-label="Copy length"
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </Field>

        <Field label="Industry recipe">
          <select
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            className="w-full rounded-lg border border-black/12 px-2 py-1.5 text-sm"
            aria-label="Industry recipe"
          >
            {INDUSTRY_RECIPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.name}
              </option>
            ))}
          </select>
        </Field>

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

        <Field label="Media">
          <div className="flex flex-wrap gap-3 text-sm text-black/65">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasChart}
                onChange={(e) => setHasChart(e.target.checked)}
              />
              Chart
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasImage}
                onChange={(e) => setHasImage(e.target.checked)}
              />
              Image
            </label>
          </div>
        </Field>
      </div>

      <div className="text-xs uppercase tracking-widest text-black/45">
        {considered.toLocaleString()} legal combinations scored across{" "}
        {SECTION_FRAMEWORKS.length} section frameworks
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {decisions.map(({ sf, decision }) => {
          const best = decision.best;
          const curatedDiffers =
            decision.curatedVariantId && best && decision.curatedVariantId !== best.variantId;
          return (
            <div key={sf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs text-black/50">{sf.id}</span>
                <span className="font-mono text-xs text-black/40">
                  {decision.consideredCount} combos
                </span>
              </div>
              <div className="mt-1 font-medium">{sf.name}</div>

              {best ? (
                <>
                  <div className="mt-3 text-xs uppercase tracking-widest" style={{ color: ink }}>
                    Recommended
                  </div>
                  <div className="font-mono text-sm">{best.variantId}</div>
                  <div className="text-sm text-black/65">{best.name}</div>

                  <dl className="mt-3 space-y-1 text-xs text-black/55">
                    <div>
                      Level: {best.level} · layout {best.layoutId} · score{" "}
                      <span className="font-mono">{best.score.toFixed(3)}</span>
                    </div>
                    <div>
                      Sizing: {decision.canvas.aspect} · fill bias{" "}
                      <span className="font-mono">{decision.canvas.fillBias.toFixed(2)}</span> ·{" "}
                      {decision.canvas.suggestedSlides} slide
                      {decision.canvas.suggestedSlides === 1 ? "" : "s"}
                    </div>
                    <div>
                      Display ×<span className="font-mono">{best.fill.display.toFixed(2)}</span> ·
                      body ×<span className="font-mono">{best.fill.body.toFixed(2)}</span> · load{" "}
                      <span className="font-mono">{best.fill.load.toFixed(2)}</span>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {decision.canvas.splitRecommended && (
                      <Chip tone="warn">split across {decision.canvas.suggestedSlides}</Chip>
                    )}
                    {!best.feasible && <Chip tone="warn">no exact fit</Chip>}
                    {curatedDiffers && <Chip tone="ink">beats curated {decision.curatedVariantId}</Chip>}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-black/50">
                    {best.reasons.slice(0, 2).join("; ") || decision.rationale}
                  </p>
                  {best.violations.length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-[#A33B12]">
                      {best.violations.slice(0, 2).join("; ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-black/50">
                  No legal module variant holds this brief — reduce the block count or split the
                  slide.
                </p>
              )}
            </div>
          );
        })}
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

function Chip({ tone, children }: { tone: "ink" | "warn"; children: React.ReactNode }) {
  const style =
    tone === "warn"
      ? { backgroundColor: "#A33B1214", color: "#A33B12" }
      : { backgroundColor: "rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.6)" };
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px]" style={style}>
      {children}
    </span>
  );
}
