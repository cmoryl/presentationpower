// AI reinterpretation review — the approval gate between the AI plan and a deck.
//
// Nothing the planner proposes reaches a deck until a human approves it here:
// each slide shows the imported source copy next to the recommended native
// layout and re-written copy, with the layout swappable and the slide
// approvable / rejectable. Rejected slides fall back to the deterministic
// (non-AI) reinterpretation.

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  Columns2,
  Info,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroundingCitations } from "@/components/GroundingCitations";
import { ReinterpretComparePreview } from "@/components/imported/ReinterpretComparePreview";
import { ORIGIN_LABEL, explainDesign } from "@/lib/reinterpret-explain";
import {
  ReinterpretControls,
  type ReinterpretControlsValue,
} from "@/components/imported/ReinterpretControls";
import {
  SlideOverridePanel,
  hasSlideOverride,
} from "@/components/imported/SlideOverridePanel";
import {
  DeckContrastSummary,
  SlideContrastWarning,
} from "@/components/imported/ContrastWarnings";
import { auditDeckColors } from "@/lib/contrast-audit";
import {
  applyColorLock,
  applyTypeRhythm,
  designStyle,
  effectiveLock,
  effectiveStyleId,
  type LockedSlide,
  type SlideOverrides,
  type SlideStyleOverride,
} from "@/lib/reinterpret-style";

import { planDeckReinterpretation } from "@/lib/reinterpret-ai.functions";
import { mapStoredImportedDeck, type StoredImportedDeck } from "@/lib/imported-to-deck";
import { DESIGN_CATALOG } from "@/lib/reinterpret-design";
import {
  applyApprovedPlans,
  validateAiPlans,
  type ValidatedPlan,
} from "@/lib/reinterpret-plan";
import type { MappedSlide } from "@/lib/pptx-mapping";
import type { GroundingCitation } from "@/lib/grounding-citations";

const ISSUE_LABEL: Record<string, string> = {
  "unknown-variant": "Unknown layout — will use our own choice",
  "copy-clamped": "Copy shortened to fit",
  "content-restored": "Dropped source content restored",
};

export function ReinterpretApprovalDialog({
  deck,
  divisionId,
  disabled,
  onApprove,
}: {
  deck: StoredImportedDeck;
  divisionId: string;
  disabled?: boolean;
  /** Called with the approved, designed slides plus an approval summary. */
  onApprove: (
    slides: LockedSlide[],
    summary: { approved: number; rejected: number; model: string },
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<ValidatedPlan[]>([]);
  const [sources, setSources] = useState<GroundingCitation[]>([]);
  const [model, setModel] = useState("");
  const [approved, setApproved] = useState<Set<number>>(new Set());
  // Slides currently showing the side-by-side original vs reinterpreted preview.
  const [compare, setCompare] = useState<Set<number>>(new Set());
  // Deck-wide controls: visual language + typography / colour locks.
  const [controls, setControls] = useState<ReinterpretControlsValue>({
    styleId: "balanced",
    rhythmId: "free",
    lock: {},
  });
  // Per-slide overrides of those deck-wide controls, keyed by source index.
  const [overrides, setOverrides] = useState<SlideOverrides>({});

  // Raw per-slide mapping: the planner's input and the substrate the approved
  // plan is applied to.
  const rawMapped = useMemo(() => {
    const base = mapStoredImportedDeck(deck, { reinterpret: true, noDesign: true });
    // One typographic rhythm is applied to the source copy *before* the design
    // pass, so layouts are chosen and built from uniform copy lengths. Slides
    // with their own rhythm override break out of the deck rhythm.
    return applyTypeRhythm(base, controls.rhythmId, overrides);
  }, [deck, controls.rhythmId, overrides]);

  const styleVariantIds = useMemo(
    () => designStyle(controls.styleId).variantIds,
    [controls.styleId],
  );

  /** Slide index → favoured variant ids, for slides overriding the deck style. */
  const styleByIndex = useMemo(() => {
    const out: Record<number, string[]> = {};
    for (const [k, o] of Object.entries(overrides)) {
      if (!o?.styleId) continue;
      out[Number(k)] = designStyle(effectiveStyleId(controls.styleId, o)).variantIds;
    }
    return out;
  }, [overrides, controls.styleId]);

  // Designed slides for preview: every usable plan applied, so a reviewer can
  // see the rendered result before deciding to approve it. Variant overrides
  // live on `plans`, so this recomputes as they swap layouts.
  const previewDesigned = useMemo(() => {
    if (plans.length === 0) return new Map<number, LockedSlide>();
    const all = new Set(plans.filter((p) => p.usable).map((p) => p.index));
    const designed = applyColorLock(
      applyApprovedPlans(rawMapped, plans, all, styleVariantIds, styleByIndex),
      controls.lock,
      overrides,
    );
    return new Map(designed.map((m) => [m.source.index, m]));
  }, [plans, rawMapped, styleVariantIds, styleByIndex, controls.lock, overrides]);

  function setOverride(index: number, next: SlideStyleOverride | undefined) {
    setOverrides((prev) => {
      const copy = { ...prev };
      if (!next || !hasSlideOverride(next)) delete copy[index];
      else copy[index] = next;
      return copy;
    });
  }

  // WCAG contrast audit of every proposed colour pairing (accent as text, accent
  // as fill, ink on surface) using the *effective* lock per slide, so per-slide
  // overrides are scored too. Recomputes as locks and overrides change.
  const contrast = useMemo(
    () =>
      auditDeckColors(
        plans.map((p) => {
          const eff = effectiveLock(controls.lock, overrides[p.index]);
          return { index: p.index, accent: eff.accent, mode: eff.mode ?? "light" };
        }),
      ),
    [plans, controls.lock, overrides],
  );


  const planFn = useServerFn(planDeckReinterpretation);
  const plan = useMutation({
    mutationFn: async () => {
      const res = await planFn({
        data: {
          deckTitle: deck.original_filename.replace(/\.pptx$/i, ""),
          divisionId,
          slides: rawMapped.slice(0, 60).map((m) => ({
            index: m.source.index,
            title: m.source.title ?? "",
            bullets: (m.source.bullets ?? []).filter(Boolean).slice(0, 30),
            notes: (m.source.notes ?? "").slice(0, 2000),
            imageCount: (m.source.images ?? []).filter(Boolean).length,
            currentVariantId: m.variantId,
          })),
        },
      });
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      const validated = validateAiPlans(rawMapped, res.plans);
      setPlans(validated);
      setSources(res.sources ?? []);
      setModel(res.model);
      // Pre-approve confident, usable slides; the reviewer trims from there.
      setApproved(
        new Set(validated.filter((p) => p.usable && p.confidence >= 0.5).map((p) => p.index)),
      );
      if (validated.length === 0) toast.error("The planner returned no usable slides.");
    },
    onError: (e) => toast.error((e as Error).message || "AI planning failed"),
  });

  function openDialog() {
    setOpen(true);
    if (plans.length === 0 && !plan.isPending) plan.mutate();
  }

  function toggle(index: number) {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function setVariant(index: number, variantId: string) {
    setPlans((prev) =>
      prev.map((p) =>
        p.index === index
          ? {
              ...p,
              variantId,
              usable: true,
              designName: DESIGN_CATALOG.find((d) => d.variantId === variantId)?.name,
              issues: p.issues.filter((i) => i !== "unknown-variant"),
            }
          : p,
      ),
    );
    setApproved((prev) => new Set(prev).add(index));
  }

  function toggleCompare(index: number) {
    setCompare((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAllCompare() {
    setCompare((prev) =>
      prev.size === plans.length ? new Set() : new Set(plans.map((p) => p.index)),
    );
  }

  function approveAll() {
    setApproved(new Set(plans.filter((p) => p.usable).map((p) => p.index)));
  }

  function build() {
    const designed = applyColorLock(
      applyApprovedPlans(rawMapped, plans, approved, styleVariantIds, styleByIndex),
      controls.lock,
      overrides,
    );

    onApprove(designed, {
      approved: approved.size,
      rejected: Math.max(0, plans.length - approved.size),
      model,
    });
    setOpen(false);
  }

  const usable = plans.filter((p) => p.usable).length;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={disabled || deck.slides.length === 0}
        title="Let AI re-author every slide in our design system, then review and approve slide by slide"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] bg-white px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7]/5 disabled:opacity-60"
      >
        <Wand2 size={12} /> AI reinterpret + review
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-black/10 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[#03002C]">
              <Sparkles size={16} className="text-[#003FC7]" />
              AI reinterpretation review
            </DialogTitle>
            <DialogDescription>
              {deck.original_filename} · every slide below is a proposal. Approve the ones you want
              in our design system; rejected slides keep the standard reinterpretation.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[58vh] overflow-y-auto px-6 py-4">
            {plan.isPending && (
              <div className="flex items-center gap-2 py-16 text-sm text-black/50">
                <Loader2 size={16} className="animate-spin" />
                Reading the deck, retrieving division knowledge, and designing each slide…
              </div>
            )}

            {!plan.isPending && plans.length > 0 && (
              <>
                <ReinterpretControls
                  value={controls}
                  onChange={setControls}
                  brandModeId={divisionId}
                />
                <DeckContrastSummary audit={contrast} className="mt-4" />
                <GroundingCitations citations={sources} tone="light" className="mt-4 mb-4" />
                <ul className="space-y-3">
                  {plans.map((p) => {
                    const src = rawMapped.find((m) => m.source.index === p.index);
                    const isApproved = approved.has(p.index);
                    const designedSlide = previewDesigned.get(p.index);
                    const why =
                      designedSlide && src ? explainDesign(designedSlide, src) : null;
                    return (
                      <li
                        key={p.index}
                        className={`rounded-xl border p-4 transition ${
                          isApproved
                            ? "border-[#003FC7]/40 bg-[#003FC7]/[0.03]"
                            : "border-black/10 bg-white opacity-70"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="text-xs uppercase tracking-widest text-black/40">
                            Slide {p.index + 1}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/60">
                              {Math.round(p.confidence * 100)}% confidence
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCompare(p.index)}
                              title="Compare the original slide with the reinterpreted design"
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                                compare.has(p.index)
                                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                                  : "border-black/15 bg-white text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]"
                              }`}
                            >
                              <Columns2 size={11} />
                              {compare.has(p.index) ? "Hide preview" : "Compare"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggle(p.index)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                                isApproved
                                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                                  : "border-black/15 bg-white text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]"
                              }`}
                            >
                              {isApproved ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                              {isApproved ? "Approved" : "Rejected"}
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-black/35">
                              Imported source
                            </div>
                            <div className="mt-1 text-sm font-medium text-black/70">
                              {src?.source.title || "—"}
                            </div>
                            <ul className="mt-1 space-y-0.5 text-xs text-black/50">
                              {(src?.source.bullets ?? []).slice(0, 6).map((b, i) => (
                                <li key={i}>• {b}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-[#003FC7]/70">
                              Proposed design
                            </div>
                            <select
                              value={p.variantId}
                              onChange={(e) => setVariant(p.index, e.target.value)}
                              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-[#03002C]"
                            >
                              {!DESIGN_CATALOG.some((d) => d.variantId === p.variantId) && (
                                <option value={p.variantId}>{p.variantId} (unknown)</option>
                              )}
                              {DESIGN_CATALOG.map((d) => (
                                <option key={d.variantId} value={d.variantId}>
                                  {d.name} · {d.variantId}
                                </option>
                              ))}
                            </select>
                            {p.title && (
                              <div className="mt-2 text-sm font-medium text-[#03002C]">
                                {p.title}
                              </div>
                            )}
                            <ul className="mt-1 space-y-0.5 text-xs text-black/60">
                              {(p.bullets ?? []).slice(0, 6).map((b, i) => (
                                <li key={i}>• {b}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <SlideOverridePanel
                          value={overrides[p.index]}
                          onChange={(next) => setOverride(p.index, next)}
                          deckStyleId={controls.styleId}
                          deckRhythmId={controls.rhythmId}
                        />

                        {contrast.bySlide.get(p.index) && (
                          <SlideContrastWarning
                            audit={contrast.bySlide.get(p.index)!}
                            onUseSafeAccent={(hex) =>
                              setOverride(p.index, { ...overrides[p.index], accent: hex })
                            }
                          />
                        )}



                        {compare.has(p.index) && (
                          <ReinterpretComparePreview
                            importedDeckId={deck.id}
                            slideIndex={p.index}
                            designed={previewDesigned.get(p.index)}
                            brandModeId={divisionId}
                            mode={
                              overrides[p.index]?.mode === null
                                ? "light"
                                : (overrides[p.index]?.mode ??
                                  controls.lock.mode ??
                                  "light")
                            }
                          />
                        )}


                        {why && (
                          <div className="mt-3 rounded-lg border border-[#003FC7]/15 bg-[#E0E8F5]/50 p-3">
                            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#003FC7]/80">
                              <Info size={11} /> Why this layout
                            </div>
                            <p className="mt-1 text-xs text-[#03002C]">
                              <span className="font-medium">{why.moduleName}</span>{" "}
                              <span className="text-black/40">({why.variantId})</span> ·{" "}
                              {ORIGIN_LABEL[why.origin]}.
                            </p>
                            {why.signals.length > 0 ? (
                              <p className="mt-1 text-xs text-black/55">
                                Driven by: {why.signals.join(", ")}.
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-black/55">
                                No strong content signals — the layout follows deck rhythm and
                                variety rules.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-3 text-xs italic text-black/45">{p.rationale}</div>
                        {p.issues.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.issues.map((i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-full bg-[#FFEB66]/40 px-2 py-0.5 text-[11px] text-black/60"
                              >
                                <AlertTriangle size={10} /> {ISSUE_LABEL[i] ?? i}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {!plan.isPending && plans.length === 0 && (
              <div className="py-16 text-center text-sm text-black/50">
                No proposal yet.
                <button
                  type="button"
                  onClick={() => plan.mutate()}
                  className="ml-2 underline hover:text-[#003FC7]"
                >
                  Run the planner
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-[#F2F2F2] px-6 py-3">
            <div className="text-xs text-black/55">
              {plans.length > 0
                ? `${approved.size} of ${plans.length} slides approved${usable < plans.length ? ` · ${plans.length - usable} need a layout` : ""}`
                : "Awaiting plan"}
              {model && <span className="ml-2 text-black/35">{model}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAllCompare}
                disabled={plans.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50"
              >
                <Columns2 size={12} />
                {compare.size === plans.length && plans.length > 0
                  ? "Hide all previews"
                  : "Compare all"}
              </button>
              <button
                type="button"
                onClick={approveAll}
                disabled={plans.length === 0}
                className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50"
              >
                Approve all
              </button>
              <button
                type="button"
                onClick={() => plan.mutate()}
                disabled={plan.isPending}
                className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50"
              >
                Re-plan
              </button>
              <button
                type="button"
                onClick={build}
                disabled={plans.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] bg-[#003FC7] px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
              >
                <Check size={12} /> Build deck with {approved.size} approved
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
