// ---------------------------------------------------------------------------
// Per-slide fit tuning for QA copy-length warnings.
//
// The deterministic auto-fixer (qa-autofix.ts) resolves structural gates —
// overflow splits, donor fills, accent contrast, capacity swaps. What it leaves
// behind on a division run are copy-length warnings: a title or an item body
// that is longer than its module's authored character cap.
//
// Two honest ways to clear those without deleting anything:
//   1. Give the slide real room — drop the rendered type scale and raise the
//      words-per-block budget for THAT slide only (a templateOverride), so the
//      long copy genuinely fits the sheet at 1920×1080.
//   2. Rewrite the copy to the cap with the AI copy-fit pass (qa-ai-fix.ts).
//
// This module owns (1) and reports what is left for (2). Tuning is recorded
// per slide as an override, so the library keeps improving every untouched
// slide and a single click hands the slide back.
// ---------------------------------------------------------------------------

import { runQa, type QaIssue } from "./qa";
import { MODULE_VARIANTS, byId } from "./taxonomy";
import { TEMPLATE_TYPE_RANGE, clampTemplateType } from "./section-templates";
import type { Deck, DeckSlide } from "./deck-store";
import { useDeckStore } from "./deck-store";

export interface FitTune {
  slideId: string;
  position: number;
  variantId: string;
  /** Longest offending copy ÷ its cap. 1.0 = exactly at cap. */
  ratio: number;
  /** Which axes the tune touches, in px at the 1920×1080 master. */
  typeScale: { display?: number; body?: number };
  density: { wordsPerBlock?: number };
  fillBias: number;
  reasons: string[];
}

export interface FitTuneSummary {
  block: number;
  warn: number;
  copyLength: number;
}

const COPY_CODES = new Set(["title-too-long", "body-too-long"]);

/** Live QA counts for a deck, split so a panel can show progress to zero. */
export function summarizeQa(deck: Deck): FitTuneSummary {
  const issues = runQa(deck.slides, deck.brandModeId);
  return {
    block: issues.filter((i) => i.severity === "block").length,
    warn: issues.filter((i) => i.severity === "warn").length,
    copyLength: issues.filter((i) => COPY_CODES.has(i.code)).length,
  };
}

export function copyLengthIssues(deck: Deck): QaIssue[] {
  return runQa(deck.slides, deck.brandModeId).filter((i) => COPY_CODES.has(i.code));
}

function longestOverrun(slide: DeckSlide): { ratio: number; where: string[] } {
  const variant = byId(MODULE_VARIANTS, slide.variantId);
  if (!variant) return { ratio: 1, where: [] };
  let ratio = 1;
  const where: string[] = [];

  const titleCap = variant.capacity.titleChars;
  const title = slide.content.title;
  if (titleCap && typeof title === "string" && title.length > titleCap) {
    ratio = Math.max(ratio, title.length / titleCap);
    where.push(`title ${title.length}/${titleCap} chars`);
  }

  const bodyCap = variant.capacity.bodyChars;
  if (bodyCap && Array.isArray(slide.content.items)) {
    for (const raw of slide.content.items as Array<Record<string, unknown>>) {
      const body = typeof raw.body === "string" ? raw.body : raw.description;
      if (typeof body === "string" && body.length > bodyCap) {
        ratio = Math.max(ratio, body.length / bodyCap);
        where.push(`body ${body.length}/${bodyCap} chars`);
      }
    }
  }
  return { ratio, where };
}

/**
 * Plan a tune for every slide whose copy runs past its cap. Type scale drops
 * proportionally to the overrun (never below the library's floor), the
 * words-per-block budget rises to match the copy actually on the slide, and
 * the sheet-fill bias eases back so the extra lines have somewhere to go.
 */
export function planFitTuning(deck: Deck): FitTune[] {
  const flagged = new Set(copyLengthIssues(deck).map((i) => i.slideId));
  const tunes: FitTune[] = [];

  for (const slide of deck.slides) {
    if (!flagged.has(slide.id)) continue;
    const { ratio, where } = longestOverrun(slide);
    if (ratio <= 1) continue;

    // A 20% overrun is a small type step; a 2× overrun goes to the floor.
    const shrink = Math.min(0.34, (ratio - 1) * 0.55);
    const current = slide.templateOverride?.typeScale ?? {};
    const displayBase = current.display ?? 72;
    const bodyBase = current.body ?? 32;

    const display = clampTemplateType("display", Math.round(displayBase * (1 - shrink)));
    const body = clampTemplateType("body", Math.round(bodyBase * (1 - shrink * 0.8)));

    tunes.push({
      slideId: slide.id,
      position: slide.position,
      variantId: slide.variantId,
      ratio,
      typeScale: {
        ...(display < displayBase ? { display } : {}),
        ...(body < bodyBase ? { body } : {}),
      },
      density: { wordsPerBlock: Math.ceil(26 * ratio) },
      fillBias: Number(Math.max(0.82, 1 - (ratio - 1) * 0.25).toFixed(2)),
      reasons: [
        ...where,
        `type −${Math.round(shrink * 100)}% (floor ${TEMPLATE_TYPE_RANGE.display[0]}/${TEMPLATE_TYPE_RANGE.body[0]}px)`,
      ],
    });
  }

  return tunes.sort((a, b) => b.ratio - a.ratio);
}

/** Write the planned tunes as per-slide template overrides. Returns count. */
export function applyFitTuning(deckId: string, tunes: FitTune[]): number {
  const setOverride = useDeckStore.getState().setSlideTemplateOverride;
  for (const tune of tunes) {
    setOverride(deckId, tune.slideId, {
      ...(Object.keys(tune.typeScale).length > 0 ? { typeScale: tune.typeScale } : {}),
      density: tune.density,
      fillBias: tune.fillBias,
    });
  }
  return tunes.length;
}

/** Hand one slide back to the library defaults. */
export function clearFitTuning(deckId: string, slideId: string): void {
  useDeckStore.getState().setSlideTemplateOverride(deckId, slideId, null);
}
