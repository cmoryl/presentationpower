// Per-slide accuracy score: how faithfully the designed slide represents the
// imported original. Pure and deterministic so the review panel, tests and any
// later report all read the same number.
//
// Four measured facets, weighted:
//   copy    (0.55) — source bullets represented on the canvas (parent slide +
//                    any authored continuation pages)
//   title   (0.15) — the headline still carries the source headline's words
//   media   (0.20) — imported pictures kept on the designed page
//   data    (0.10) — charts / tables / diagrams the source carried survive as
//                    slide data rather than being dropped
//
// A facet the source cannot exercise (no images, no title) is skipped and its
// weight redistributed, so a text-only slide can still reach 100.

import type { MappedSlide } from "./pptx-mapping";
import { collectStrings, isCovered, norm } from "./reinterpret-design";

export type AccuracyFacet = {
  id: "copy" | "title" | "media" | "data";
  label: string;
  /** 0–1 for this facet. */
  score: number;
  weight: number;
  detail: string;
};

export type SlideAccuracy = {
  /** 0–100, rounded. */
  score: number;
  band: "high" | "medium" | "low";
  facets: AccuracyFacet[];
  /** Source lines still not on any canvas. */
  missing: string[];
};

const BAND = (score: number): SlideAccuracy["band"] =>
  score >= 90 ? "high" : score >= 70 ? "medium" : "low";

function slideHaystack(slide: MappedSlide): string {
  const parts: unknown[] = [slide.content, ...(slide.continuations ?? []).map((c) => c.content)];
  if (slide.canvasBlocks?.length) parts.push(slide.canvasBlocks);
  return norm(collectStrings(parts).join(" ⋄ "));
}

/**
 * Imported pictures actually placed on the designed page(s): the slide-level
 * hero plus any per-item tile (grids, strips, matrices) or panel photo.
 */
function mediaCount(slide: MappedSlide): number {
  const pages = [slide, ...(slide.continuations ?? [])];
  let n = 0;
  const walk = (v: unknown, depth = 0): void => {
    if (depth > 4 || !v) return;
    if (Array.isArray(v)) {
      for (const item of v) walk(item, depth + 1);
      return;
    }
    if (typeof v !== "object") return;
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      if (key === "extraImages") continue;
      if (key === "mediaUrl" && typeof val === "string" && val) n += 1;
      else if (key === "media" && Array.isArray(val)) n += val.filter(Boolean).length;
      else walk(val, depth + 1);
    }
  };
  for (const page of pages) walk(page.content);
  return n;
}


function dataCount(slide: MappedSlide): number {
  const pages = [slide, ...(slide.continuations ?? [])];
  let n = 0;
  for (const page of pages) {
    const c = page.content as Record<string, unknown>;
    for (const key of ["series", "chart", "rows", "columns", "table", "nodes", "stages"]) {
      const v = c[key];
      if (Array.isArray(v) ? v.length > 0 : Boolean(v)) n += 1;
    }
  }
  return n;
}

export function scoreSlideAccuracy(slide: MappedSlide): SlideAccuracy {
  const haystack = slideHaystack(slide);
  const sourceBullets = (slide.source.bullets ?? []).map((b) => (b ?? "").trim()).filter(Boolean);
  const missing = sourceBullets.filter((b) => !isCovered(b, haystack));

  const facets: AccuracyFacet[] = [];

  if (sourceBullets.length > 0) {
    const kept = sourceBullets.length - missing.length;
    facets.push({
      id: "copy",
      label: "Source copy",
      score: kept / sourceBullets.length,
      weight: 0.55,
      detail: `${kept} of ${sourceBullets.length} source lines on the canvas${
        slide.continuations?.length
          ? ` (incl. ${slide.continuations.length} continuation page${slide.continuations.length === 1 ? "" : "s"})`
          : ""
      }`,
    });
  }

  const sourceTitle = (slide.source.title ?? "").trim();
  if (sourceTitle) {
    const words = norm(sourceTitle)
      .split(" ")
      .filter((w) => w.length >= 4);
    const hits = words.filter((w) => haystack.includes(w)).length;
    const score = words.length === 0 ? (isCovered(sourceTitle, haystack) ? 1 : 0) : hits / words.length;
    facets.push({
      id: "title",
      label: "Headline",
      score,
      weight: 0.15,
      detail:
        score >= 0.99
          ? "Source headline carried through"
          : score > 0
            ? "Headline re-written — some source wording dropped"
            : "Source headline is not represented",
    });
  }

  const sourceImages = (slide.source.images ?? []).filter(Boolean).length;
  if (sourceImages > 0) {
    const kept = Math.min(sourceImages, mediaCount(slide));
    facets.push({
      id: "media",
      label: "Imagery",
      score: kept / sourceImages,
      weight: 0.2,
      detail: `${kept} of ${sourceImages} imported picture${sourceImages === 1 ? "" : "s"} placed`,
    });
  }

  const sourceData =
    (slide.source.charts ?? []).length +
    (slide.source.tables ?? []).length +
    (slide.source.diagrams ?? []).length;
  if (sourceData > 0) {
    const kept = Math.min(sourceData, dataCount(slide));
    facets.push({
      id: "data",
      label: "Charts & tables",
      score: kept / sourceData,
      weight: 0.1,
      detail: `${kept} of ${sourceData} data object${sourceData === 1 ? "" : "s"} rebuilt as slide data`,
    });
  }

  if (facets.length === 0) {
    // Nothing measurable on the source (a divider or picture-less title page).
    return { score: 100, band: "high", facets: [], missing: [] };
  }

  const totalWeight = facets.reduce((n, f) => n + f.weight, 0);
  const weighted = facets.reduce((n, f) => n + f.score * f.weight, 0) / totalWeight;
  const score = Math.round(Math.max(0, Math.min(1, weighted)) * 100);
  return { score, band: BAND(score), facets, missing };
}

/** Deck-level roll-up for the review header. */
export function scoreDeckAccuracy(slides: MappedSlide[]): {
  average: number;
  worst: { index: number; score: number } | null;
  lowCount: number;
} {
  if (slides.length === 0) return { average: 100, worst: null, lowCount: 0 };
  let sum = 0;
  let worst: { index: number; score: number } | null = null;
  let lowCount = 0;
  for (const s of slides) {
    const a = scoreSlideAccuracy(s);
    sum += a.score;
    if (a.band === "low") lowCount += 1;
    if (!worst || a.score < worst.score) worst = { index: s.source.index, score: a.score };
  }
  return { average: Math.round(sum / slides.length), worst, lowCount };
}
