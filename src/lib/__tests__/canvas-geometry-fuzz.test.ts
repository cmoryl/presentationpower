import { describe, expect, it } from "vitest";
import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";
import { blocksAreHealthy, repairBlocks } from "@/lib/canvas-repair";
import { healDeckCanvasGeometry, type CanvasBlock, type Deck } from "@/lib/deck-store";
import { canvasBlocksForExport } from "@/lib/export-canvas-blocks";
import { auditDeckGeometry } from "@/lib/canvas-repair-report";
import { normalizeCanvasBlocks } from "@/lib/custom-modules";

/**
 * Randomized fuzzing over canvas block layouts.
 *
 * The healing contract must hold for ANY geometry a deck can carry — not just
 * the hand-picked corrupted cases in canvas-geometry-cycle.test.ts. Every case
 * below is generated from a seeded PRNG so failures are reproducible: the seed
 * is printed in the assertion message.
 */

/** Deterministic 32-bit PRNG (mulberry32) so fuzz failures replay exactly. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS: CanvasBlock["kind"][] = ["heading", "body", "caption", "image", "shape"];

type Rand = () => number;

const pick = <T,>(r: Rand, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo);

/** One block spanning the interesting space: sane, bleeding, huge, degenerate. */
function fuzzBlock(r: Rand, i: number): CanvasBlock {
  const flavour = Math.floor(r() * 6);
  const base = { id: `fz-${i}`, kind: pick(r, KINDS), text: `Block ${i}` };
  switch (flavour) {
    case 0: // healthy, fully inside the stage
      return { ...base, x: between(r, 0, 900), y: between(r, 0, 500), w: between(r, 40, 900), h: between(r, 30, 500), size: between(r, 12, 96) } as CanvasBlock;
    case 1: // slight intentional bleed past an edge
      return { ...base, x: between(r, -40, 10), y: between(r, -30, 10), w: STAGE_W + between(r, 0, 60), h: STAGE_H + between(r, 0, 40), size: between(r, 16, 72) } as CanvasBlock;
    case 2: // measured on an unscaled stage (2x–4x)
      {
        const k = between(r, 2, 4);
        return { ...base, x: between(r, 0, 800) * k, y: between(r, 0, 400) * k, w: between(r, 100, 900) * k, h: between(r, 80, 500) * k, size: between(r, 14, 80) * k } as CanvasBlock;
      }
    case 3: // extreme overflow
      return { ...base, x: between(r, 0, 40000), y: between(r, 0, 30000), w: between(r, 1000, 20000), h: between(r, 800, 12000), size: between(r, 100, 4000) } as CanvasBlock;
    case 4: // degenerate / sub-pixel
      return { ...base, x: between(r, -5, 5), y: between(r, -5, 5), w: between(r, 0.1, 3), h: between(r, 0.1, 3), size: between(r, 0.5, 6) } as CanvasBlock;
    default: // no explicit size (shapes/images often omit it)
      return { ...base, x: between(r, -200, 5000), y: between(r, -200, 3000), w: between(r, 20, 6000), h: between(r, 20, 4000) } as CanvasBlock;
  }
}

function fuzzSlides(r: Rand) {
  const slideCount = 1 + Math.floor(r() * 4);
  return Array.from({ length: slideCount }, (_, s) => ({
    id: `s${s}`,
    moduleId: "MV-HERO",
    variantId: "MV-HERO-SPLIT",
    title: `Slide ${s + 1}`,
    canvasBlocks: Array.from({ length: Math.floor(r() * 7) }, (_, i) => fuzzBlock(r, s * 10 + i)),
  }));
}

const deckOf = (slides: ReturnType<typeof fuzzSlides>): Deck =>
  ({ id: "fuzz-deck", briefId: "fuzz-brief", slides }) as unknown as Deck;

const fits = (b: CanvasBlock) =>
  b.w <= STAGE_W * 1.15 + 2 &&
  b.h <= STAGE_H * 1.15 + 2 &&
  b.x + b.w <= STAGE_W * 1.15 + 2 &&
  b.y + b.h <= STAGE_H * 1.15 + 2;

const SEEDS = Array.from({ length: 200 }, (_, i) => 1000 + i * 7919);

describe("fuzz: canvas geometry healing invariants", () => {
  it("is idempotent for every generated layout", () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const blocks = Array.from({ length: 1 + Math.floor(r() * 8) }, (_, i) => fuzzBlock(r, i));
      const once = repairBlocks(blocks);
      const twice = repairBlocks(once);
      expect(twice, `seed ${seed}`).toBe(once); // same array ⇒ nothing left to repair
      expect(blocksAreHealthy(once), `seed ${seed}`).toBe(true);
    }
  });

  it("always lands blocks within the stage tolerance and keeps finite numbers", () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const blocks = Array.from({ length: 1 + Math.floor(r() * 8) }, (_, i) => fuzzBlock(r, i));
      const healed = repairBlocks(blocks);
      healed.forEach((b, i) => {
        expect(fits(b), `seed ${seed} block ${b.id}`).toBe(true);
        for (const n of [b.x, b.y, b.w, b.h, b.size ?? 1]) {
          expect(Number.isFinite(n), `seed ${seed} block ${b.id}`).toBe(true);
        }
        expect(Object.is(b.x, -0) || Object.is(b.y, -0), `seed ${seed} block ${b.id}`).toBe(false);
        expect(b.w, `seed ${seed}`).toBeGreaterThan(0);
        expect(b.h, `seed ${seed}`).toBeGreaterThan(0);
        // Repaired text keeps a legible floor; untouched blocks are left alone.
        if (b !== blocks[i] && typeof b.size === "number") {
          expect(b.size, `seed ${seed}`).toBeGreaterThanOrEqual(8);
        }
      });
    }
  });


  it("never distorts aspect ratio (uniform scale only) or reorders blocks", () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const blocks = Array.from({ length: 1 + Math.floor(r() * 8) }, (_, i) => fuzzBlock(r, i));
      const healed = repairBlocks(blocks);
      expect(healed.length, `seed ${seed}`).toBe(blocks.length);
      healed.forEach((h, i) => {
        const b = blocks[i]!;
        expect(h.id, `seed ${seed}`).toBe(b.id);
        expect(h.kind, `seed ${seed}`).toBe(b.kind);
        if (h === b) return;
        const kw = h.w / b.w;
        const kh = h.h / b.h;
        // Rounding to whole pixels perturbs tiny boxes, so allow slack there.
        const slack = Math.max(0.02, 2 / Math.min(b.w, b.h));
        expect(Math.abs(kw - kh), `seed ${seed} block ${b.id}`).toBeLessThanOrEqual(slack);
        expect(kw, `seed ${seed}`).toBeLessThanOrEqual(1.001);
      });
    }
  });

  it("renderer, reload, export and library-load agree on every generated deck", () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const slides = fuzzSlides(r);
      const deck = deckOf(slides);
      const reloaded = healDeckCanvasGeometry(JSON.parse(JSON.stringify(deck)) as Deck);
      reloaded.slides.forEach((slide, i) => {
        const source = slides[i]!.canvasBlocks;
        const rendered = repairBlocks(source);
        expect(slide.canvasBlocks, `seed ${seed} slide ${i}`).toEqual([...rendered]);
        expect(canvasBlocksForExport(source), `seed ${seed} slide ${i}`).toEqual([...rendered]);
        const library = normalizeCanvasBlocks(JSON.parse(JSON.stringify(source)));
        expect(library.every(fits), `seed ${seed} slide ${i}`).toBe(true);
      });
      // Re-healing a healed deck must be a no-op.
      const again = healDeckCanvasGeometry(JSON.parse(JSON.stringify(reloaded)) as Deck);
      expect(again.slides.map((s) => s.canvasBlocks), `seed ${seed}`).toEqual(
        reloaded.slides.map((s) => s.canvasBlocks),
      );
    }
  });

  it("the repair report counts exactly the blocks the export changed", () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const slides = fuzzSlides(r);
      const report = auditDeckGeometry(slides);
      const total = slides.reduce((n, s) => n + s.canvasBlocks.length, 0);
      expect(report.blocksChecked, `seed ${seed}`).toBe(total);
      const changed = slides.reduce((n, s) => {
        const healed = canvasBlocksForExport(s.canvasBlocks);
        return n + s.canvasBlocks.filter((b, i) => healed[i] !== b).length;
      }, 0);
      expect(report.blocksRepaired, `seed ${seed}`).toBe(changed);
      expect(report.repaired, `seed ${seed}`).toBe(changed > 0);
      expect(Boolean(report.summary), `seed ${seed}`).toBe(changed > 0);
    }
  });
});
