// ---------------------------------------------------------------------------
// DIVISION FIT ENGINE
//
// The layout arbiter scores one slide at a time. A deck is not a bag of slides:
// a division's spec (its approved light/dark packs, its ground recipe, its
// conformance set) plus the *neighbouring* slides decide whether a layout is
// actually the best one. This engine plans a whole section sequence for one
// brand scope, threading each slide's decision into the next as neighbour
// context so rhythm is earned across the run, not just inside a single slide.
//
// Pure and deterministic: same brief in, same plan out. No React, no I/O.
// ---------------------------------------------------------------------------

import {
  arbitrateLayout,
  type LayoutBrief,
  type LayoutCandidate,
  type LayoutContent,
  type CanvasRecommendation,
} from "./layout-arbiter";
import { divisionConformancePreset } from "./division-conformance";
import { BRAND_PROFILES } from "./brand-profiles";
import { divisionDesignSpec } from "./division-design-specs";
import { NARRATIVE_ARCHETYPES, SECTION_FRAMEWORKS, byId } from "./taxonomy";
import type { TemplateLevel } from "./section-templates";

export type DivisionSlideBrief = {
  sectionId: string;
  content: LayoutContent;
  /** Face this slide renders on — selects the division's light or dark pack. */
  face?: "light" | "dark";
  level?: TemplateLevel | null;
};

export type DivisionFitBrief = {
  brandModeId: string;
  /** Slides in deck order. */
  slides: DivisionSlideBrief[];
  canvas?: { width: number; height: number };
  /** How far back neighbour repetition is penalised. Default 3. */
  rhythmWindow?: number;
};

export type DivisionSlidePlan = {
  index: number;
  sectionId: string;
  sectionName: string;
  face: "light" | "dark";
  /** Approved pack this slide must wear, from the division spec. */
  packId: string;
  recipe: string | null;
  best: LayoutCandidate | null;
  canvas: CanvasRecommendation;
  curatedVariantId: string | null;
  consideredCount: number;
  rationale: string;
  /** Variant ids fed in as neighbours for this slide's rhythm penalty. */
  neighbours: string[];
  /** True when the winner sits in the division's conformance set. */
  inSpec: boolean;
  notes: string[];
};

export type DivisionFitPlan = {
  brandModeId: string;
  name: string;
  packId: string;
  darkPackId: string;
  recipe: string | null;
  rationale: string;
  slides: DivisionSlidePlan[];
  /** Distinct winners ÷ slides — 1 means no layout repeats. */
  variety: number;
  /** Slides whose winner is outside the division conformance set. */
  offSpecCount: number;
  /** Slides the engine wants split across more than one sheet. */
  splitCount: number;
  /** Mean winning score across the run. */
  meanScore: number;
  totalConsidered: number;
  /** Whole-run observations for the Atlas panel and the agent. */
  findings: string[];
};

/** Section sequence for a narrative archetype, deduped and validated. */
export function sectionSequence(archetypeId: string): string[] {
  const arch = NARRATIVE_ARCHETYPES.find((a) => a.id === archetypeId);
  const ids = arch?.sectionRecipe ?? SECTION_FRAMEWORKS.slice(0, 8).map((s) => s.id);
  return ids.filter((id) => Boolean(byId(SECTION_FRAMEWORKS, id)));
}

/**
 * Plan a run of slides for one division. Each slide is arbitrated with the
 * division's spec AND the winners of the previous `rhythmWindow` slides as
 * neighbour context, so a layout that already carried the run is pushed aside
 * for the next-best fit instead of repeating.
 */
export function planDivisionFit(brief: DivisionFitBrief): DivisionFitPlan {
  const preset = divisionConformancePreset(brief.brandModeId);
  const spec = divisionDesignSpec(brief.brandModeId);
  const owned = new Set(preset.moduleIds);
  const window = Math.max(0, brief.rhythmWindow ?? 3);
  const canvas = brief.canvas ?? { width: 16, height: 9 };

  const used: string[] = [];
  const slides: DivisionSlidePlan[] = [];

  brief.slides.forEach((slide, index) => {
    const neighbours = window > 0 ? used.slice(-window) : [];
    const face = slide.face ?? "light";
    const layoutBrief: LayoutBrief = {
      sectionId: slide.sectionId,
      level: slide.level ?? null,
      industryId: preset.recipe ?? spec.recipe,
      brandModeId: brief.brandModeId,
      content: slide.content,
      canvas,
      avoid: neighbours,
    };
    const decision = arbitrateLayout(layoutBrief);
    // Brand governance tiebreak: when a variant the brand has actually curated
    // scores within a whisker of the raw winner, the curated one wins. Keeps
    // the run inside the brand's preferred set without overriding a materially
    // better layout.
    const preferredIds = new Set(
      BRAND_PROFILES[brief.brandModeId]?.contentScope.preferredVariantIds ?? [],
    );
    const rawBest = decision.best;
    const curatedClose =
      rawBest && !preferredIds.has(rawBest.variantId)
        ? (decision.candidates.find(
            (c) =>
              preferredIds.has(c.variantId) &&
              c.feasible &&
              rawBest.score - c.score <= 0.03 &&
              !neighbours.includes(c.variantId),
          ) ?? null)
        : null;
    const best = curatedClose ?? rawBest;
    const notes: string[] = [];
    if (curatedClose && rawBest) {
      notes.push(
        `brand-preferred ${curatedClose.variantId} taken over ${rawBest.variantId} (within 0.03 of the top score)`,
      );
    }

    if (best && neighbours.includes(best.variantId)) {
      notes.push("no unrepeated alternative held this content — repeat is deliberate");
    }
    if (best && decision.curatedVariantId && decision.curatedVariantId !== best.variantId) {
      notes.push(`beats the curated default ${decision.curatedVariantId} on this brief`);
    }
    if (best && !best.feasible) {
      notes.push(`no exact fit: ${best.violations.slice(0, 2).join("; ")}`);
    }
    if (decision.canvas.splitRecommended) {
      notes.push(`split across ${decision.canvas.suggestedSlides} sheets rather than shrink type`);
    }
    if (best && !owned.has(best.variantId)) {
      notes.push("outside this division's conformance set — needs a spec decision");
    }

    slides.push({
      index,
      sectionId: slide.sectionId,
      sectionName: byId(SECTION_FRAMEWORKS, slide.sectionId)?.name ?? slide.sectionId,
      face,
      packId: face === "dark" ? spec.darkPackId : (preset.packId ?? spec.packId),
      recipe: preset.recipe ?? spec.recipe,
      best,
      canvas: decision.canvas,
      curatedVariantId: decision.curatedVariantId,
      consideredCount: decision.consideredCount,
      rationale: decision.rationale,
      neighbours,
      inSpec: best ? owned.has(best.variantId) : false,
      notes,
    });

    if (best) used.push(best.variantId);
  });

  const winners = slides.map((s) => s.best?.variantId).filter(Boolean) as string[];
  const variety = winners.length ? new Set(winners).size / winners.length : 0;
  const offSpecCount = slides.filter((s) => s.best && !s.inSpec).length;
  const splitCount = slides.filter((s) => s.canvas.splitRecommended).length;
  const meanScore = winners.length
    ? slides.reduce((n, s) => n + (s.best?.score ?? 0), 0) / winners.length
    : 0;

  const findings: string[] = [];
  findings.push(
    `${slides.length} slides planned against ${preset.name}'s spec (${preset.packId ?? spec.packId} light / ${spec.darkPackId} dark, recipe ${preset.recipe ?? spec.recipe}).`,
  );
  findings.push(
    variety >= 0.9
      ? "No layout carries the run twice — rhythm holds across the sequence."
      : `Layout variety is ${(variety * 100).toFixed(0)}% — the neighbour penalty could not always find an unrepeated fit.`,
  );
  if (offSpecCount > 0)
    findings.push(
      `${offSpecCount} slide${offSpecCount === 1 ? "" : "s"} won with a module outside the conformance set — either widen the division's set or re-brief the content.`,
    );
  if (splitCount > 0)
    findings.push(
      `${splitCount} slide${splitCount === 1 ? "" : "s"} exceed one sheet at this reading level; the engine recommends splitting rather than shrinking type.`,
    );
  const infeasible = slides.filter((s) => s.best && !s.best.feasible).length;
  if (infeasible > 0)
    findings.push(`${infeasible} slide(s) have no exact fit — trim blocks or drop a media slot.`);

  return {
    brandModeId: brief.brandModeId,
    name: preset.name,
    packId: preset.packId ?? spec.packId,
    darkPackId: spec.darkPackId,
    recipe: preset.recipe ?? spec.recipe,
    rationale: spec.rationale,
    slides,
    variety: Math.round(variety * 100) / 100,
    offSpecCount,
    splitCount,
    meanScore: Math.round(meanScore * 1000) / 1000,
    totalConsidered: slides.reduce((n, s) => n + s.consideredCount, 0),
    findings,
  };
}

/** Deterministic demo content per section so the panel has something honest to plan. */
export function demoSlideBriefs(
  sectionIds: string[],
  shape: { blocks: number; copy: "short" | "medium" | "long"; media: boolean },
): DivisionSlideBrief[] {
  const copy = {
    short: { title: "Where the work lands", body: "One line of framing." },
    medium: {
      title: "Where the work lands and what it changed",
      body: "Measured against the baseline across four markets with review cycles held constant.",
    },
    long: {
      title: "Where the work lands, what it changed, and what we would do again next cycle",
      body: "Measured against the baseline across four markets with throughput, review cycles and downstream rework held constant, so the delta is attributable to the programme rather than to seasonal demand or regional headcount changes.",
    },
  }[shape.copy];

  return sectionIds.map((sectionId, i) => ({
    sectionId,
    face: i % 3 === 2 ? "dark" : "light",
    content: {
      title: copy.title,
      body: copy.body,
      items: Array.from({ length: shape.blocks }, (_, n) => n),
      hasChart: shape.media && i % 2 === 0,
      hasImage: shape.media && i % 2 === 1,
    },
  }));
}
