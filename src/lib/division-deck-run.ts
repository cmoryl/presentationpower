// ---------------------------------------------------------------------------
// DIVISION RUN → DECK
//
// `division-fit-engine` plans a run and `division-run` proves each planned
// winner mounts to spec. This module closes the loop: it MATERIALISES the run
// as a real deck in the deck store (so it opens in the editor, presents,
// prints and exports like any other deck), then WALKS the saved deck — slide by
// slide — back against the division's spec.
//
// The walk is deliberately taken from the deck, not from the plan. Between the
// two sits deck creation: id assignment, the deterministic QA auto-fixer
// (empty fields filled, overflow continued onto new sheets, brand-preferred
// variants) and canvas healing. Any of those can move a slide away from what
// the arbiter chose, and only a deck-side walk can see it.
// ---------------------------------------------------------------------------

import { BRAND_MODES, MODULE_VARIANTS, type BrandMode, type ModuleVariant } from "./taxonomy";
import { useDeckStore, type Deck, type DeckSlide, type DeckSnapshot } from "./deck-store";
import { resolveBrandMode } from "./brand-profiles";
import { STAGE_H, STAGE_W } from "./export-quality";
import { divisionConformancePreset } from "./division-conformance";
import { buildDivisionRun, type StageCheck } from "./division-run";
import type { DivisionFitPlan } from "./division-fit-engine";
import type { StylePack } from "./style-packs";

export type DeckWalkSlide = {
  position: number;
  slideId: string;
  sectionId: string;
  variantId: string;
  packId: string;
  face: "light" | "dark";
  /** True when this deck slide traces back to a planned slide. */
  planned: boolean;
  /** Planned winner for this position, when the deck still matches the plan. */
  plannedVariantId: string | null;
  ok: boolean;
  checks: StageCheck[];
  entries: number;
  digest: string | null;
  problems: string[];
  error?: string;
};

export type DeckWalkReport = {
  deckId: string;
  title: string;
  brandModeId: string;
  divisionName: string;
  lightPackId: string;
  darkPackId: string;
  recipe: string | null;
  slides: DeckWalkSlide[];
  passCount: number;
  /** Slides the QA auto-fixer added on top of the plan (continuations). */
  addedByQa: number;
  /** Planned slides that did not survive into the deck. */
  droppedFromPlan: number;
  findings: string[];
};

/**
 * Turn a planned run into a loss-free deck snapshot: per-slide face, the
 * division's light AND dark approved packs, and the division ground recipe.
 */
export function divisionRunToDeckSnapshot(
  plan: DivisionFitPlan,
  opts: { title?: string; archetypeId?: string } = {},
): DeckSnapshot {
  const built = buildDivisionRun(plan);
  const preset = divisionConformancePreset(plan.brandModeId);
  return {
    title: opts.title ?? `${plan.name} — division run`,
    brandModeId: plan.brandModeId,
    archetypeId: opts.archetypeId ?? "",
    context: {
      // A run mixes faces, so the deck records the division's PAIR: dark slides
      // resolve to `darkStylePackId` everywhere the deck renders.
      stylePackId: plan.packId,
      darkStylePackId: plan.darkPackId,
      designRecipeId: plan.recipe,
    },
    brief: {
      prospect: "",
      industry: preset.name,
      audience: "",
      meetingObjective: `Division run for ${plan.name}`,
      lengthTarget: plan.slides.length,
      clientFacts: "",
    },
    slides: built.map((b) => ({
      sectionId: b.plan.sectionId,
      variantId: b.variant.id,
      layoutId: String(b.slide.layoutId ?? b.variant.permittedLayoutIds[0]),
      content: b.slide.content as never,
      // The plan owns light/dark; the deck carries it per slide.
      mode: b.mode,
    })),
  };
}

/** Materialise the run in the deck store and return the saved deck. */
export function createDeckFromDivisionRun(
  plan: DivisionFitPlan,
  opts: { title?: string; archetypeId?: string } = {},
): { deckId: string; briefId: string; deck: Deck } {
  const snapshot = divisionRunToDeckSnapshot(plan, opts);
  const { deckId, briefId } = useDeckStore.getState().createDeckFromSnapshot(snapshot);
  const deck = useDeckStore.getState().decks[deckId];
  return { deckId, briefId, deck };
}

function packForFace(plan: DivisionFitPlan, mode: "light" | "dark"): string {
  return mode === "dark" ? plan.darkPackId : plan.packId;
}

/**
 * Walk every slide of a materialised deck against the division spec: mount the
 * saved slide on the canonical 1920×1080 export stage wearing the pack the deck
 * itself resolves for that slide's face, then run the standard seven checks.
 */
export async function walkDeckAgainstSpec(
  deck: Deck,
  plan: DivisionFitPlan,
  opts: { onProgress?: (done: number, total: number) => void } = {},
): Promise<DeckWalkReport> {
  const { withExactStage } = await import("./slide-exact-raster");
  const { capturePlacement } = await import("./export-placement");
  const { auditStageAgainstExpectation } = await import("./division-run");
  const { deckPackResolver } = await import("@/components/slide/DeckPackScope");
  const packFor = deckPackResolver(deck);
  const preset = divisionConformancePreset(plan.brandModeId);
  const owned = new Set(preset.moduleIds);
  const brand: BrandMode =
    resolveBrandMode(deck.brandModeId, deck.subCompany) ??
    BRAND_MODES.find((b) => b.id === deck.brandModeId) ??
    BRAND_MODES[0];

  const slides: DeckWalkSlide[] = [];
  const total = deck.slides.length;

  for (let i = 0; i < total; i += 1) {
    const slide: DeckSlide = deck.slides[i];
    const planned = plan.slides[i];
    const plannedVariantId = planned?.best?.variantId ?? null;
    const samePosition = plannedVariantId === slide.variantId;
    const variant: ModuleVariant | undefined = MODULE_VARIANTS.find((v) => v.id === slide.variantId);
    const mode = slide.mode === "dark" ? "dark" : "light";
    const pack = (packFor(slide) ?? null) as StylePack | null;
    const base: DeckWalkSlide = {
      position: i,
      slideId: slide.id,
      sectionId: slide.sectionId,
      variantId: slide.variantId,
      packId: pack?.id ?? "none",
      face: mode,
      planned: samePosition,
      plannedVariantId,
      ok: false,
      checks: [],
      entries: 0,
      digest: null,
      problems: [],
    };

    if (!variant) {
      slides.push({ ...base, problems: [`unknown module ${slide.variantId}`] });
      opts.onProgress?.(i + 1, total);
      continue;
    }

    try {
      const out = await withExactStage(
        {
          slide: slide as unknown as Record<string, unknown>,
          variant,
          brand,
          mode,
          pack,
          industryId: plan.recipe,
          pageNumber: i + 1,
        },
        (stage) => {
          const checks = auditStageAgainstExpectation(stage, {
            variantId: slide.variantId,
            // The spec, not the deck, decides which pack this face must wear.
            packId: packForFace(plan, mode),
            pack,
            mode,
            inSpec: owned.has(slide.variantId),
          });
          const shot = capturePlacement(stage, { designWidth: STAGE_W, designHeight: STAGE_H });
          return { checks, entries: shot.entries.length, digest: shot.digest };
        },
      );
      if (!out) {
        slides.push({ ...base, problems: ["stage failed to mount"] });
      } else {
        const problems = out.checks.filter((c) => !c.ok).map((c) => `${c.label} — ${c.detail}`);
        if (out.entries === 0) problems.push("nothing measurable on stage");
        slides.push({
          ...base,
          ok: problems.length === 0,
          checks: out.checks,
          entries: out.entries,
          digest: out.digest,
          problems,
        });
      }
    } catch (err) {
      slides.push({
        ...base,
        problems: ["threw while mounting"],
        error: err instanceof Error ? err.message : String(err),
      });
    }
    opts.onProgress?.(i + 1, total);
  }

  const plannedIds = plan.slides.map((s) => s.best?.variantId).filter(Boolean) as string[];
  const addedByQa = Math.max(0, deck.slides.length - plannedIds.length);
  const deckIds = deck.slides.map((s) => s.variantId);
  const droppedFromPlan = plannedIds.filter((id) => !deckIds.includes(id)).length;
  const passCount = slides.filter((s) => s.ok).length;

  const findings: string[] = [];
  findings.push(
    `${passCount}/${slides.length} saved deck slides match ${plan.name}'s spec (${plan.packId} light / ${plan.darkPackId} dark, recipe ${plan.recipe ?? "none"}).`,
  );
  if (addedByQa > 0)
    findings.push(
      `The QA auto-fixer added ${addedByQa} sheet${addedByQa === 1 ? "" : "s"} on deck creation — overflow was continued rather than shrunk.`,
    );
  if (droppedFromPlan > 0)
    findings.push(
      `${droppedFromPlan} planned winner${droppedFromPlan === 1 ? "" : "s"} did not survive deck creation — a brand-preferred variant replaced them.`,
    );
  const faces = slides.filter((s) => s.face === "dark").length;
  findings.push(
    `${faces} slide${faces === 1 ? "" : "s"} render on the dark face wearing ${plan.darkPackId}; the rest wear ${plan.packId}.`,
  );
  for (const s of slides.filter((s) => !s.ok))
    findings.push(`${s.position + 1}. ${s.variantId}: ${s.problems.join("; ")}`);

  return {
    deckId: deck.id,
    title: deck.title,
    brandModeId: deck.brandModeId,
    divisionName: plan.name,
    lightPackId: plan.packId,
    darkPackId: plan.darkPackId,
    recipe: plan.recipe,
    slides,
    passCount,
    addedByQa,
    droppedFromPlan,
    findings,
  };
}
