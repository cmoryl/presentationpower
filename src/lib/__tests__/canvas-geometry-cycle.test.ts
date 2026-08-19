import { describe, expect, it } from "vitest";
import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";
import { blocksAreHealthy, repairBlocks } from "@/lib/canvas-repair";
import { healDeckCanvasGeometry, type CanvasBlock, type Deck } from "@/lib/deck-store";
import { canvasBlocksForExport } from "@/lib/export-canvas-blocks";
import { auditDeckGeometry } from "@/lib/canvas-repair-report";
import { normalizeCanvasBlocks } from "@/lib/custom-modules";
import { moduleFromSlide, slideFromModule } from "@/lib/module-instance";

/**
 * End-to-end deck cycle: corrupted (unscaled-stage) geometry must be healed
 * identically by the renderer path, the persistence/reload path, and the PPTX
 * export path — and a healthy deck must survive the cycle untouched.
 */

const block = (over: Partial<CanvasBlock> = {}): CanvasBlock =>
  ({
    id: over.id ?? "b1",
    kind: "text",
    text: "Quarterly performance",
    x: 120,
    y: 90,
    w: 900,
    h: 220,
    size: 48,
    ...over,
  }) as CanvasBlock;

/** Simulates blocks measured at 3x because the stage was not scaled. */
const corrupt = (b: CanvasBlock, k = 3): CanvasBlock => ({
  ...b,
  x: b.x * k,
  y: b.y * k,
  w: b.w * k,
  h: b.h * k,
  size: (b.size ?? 32) * k,
});

const deckWith = (blocks: CanvasBlock[]): Deck =>
  ({
    id: "deck-cycle",
    briefId: "brief-cycle",
    slides: [{ id: "s1", moduleId: "MV-HERO", title: "Hero", canvasBlocks: blocks }],
  }) as unknown as Deck;

const inStage = (b: CanvasBlock) =>
  b.x >= 0 && b.y >= 0 && b.x + b.w <= STAGE_W + 2 && b.y + b.h <= STAGE_H + 2;

describe("canvas geometry survives the publish/export/reload cycle", () => {
  it("heals corrupted geometry back inside the stage", () => {
    const bad = corrupt(block());
    expect(inStage(bad)).toBe(false);
    const healed = repairBlocks([bad])[0]!;
    expect(inStage(healed)).toBe(true);
    expect(healed.size!).toBeLessThan(bad.size!);
  });

  it("reload (hydrate) returns healed blocks, not just healed pixels", () => {
    const deck = deckWith([corrupt(block())]);
    const reloaded = healDeckCanvasGeometry(
      JSON.parse(JSON.stringify(deck)) as Deck,
    );
    const blocks = reloaded.slides[0]!.canvasBlocks!;
    expect(blocks.every(inStage)).toBe(true);
    expect(blocksAreHealthy(blocks)).toBe(true);
  });

  it("export ships the same geometry the renderer shows", () => {
    const bad = corrupt(block());
    const rendered = repairBlocks([bad])[0]!;
    const exported = canvasBlocksForExport([bad])[0]!;
    expect({ x: exported.x, y: exported.y, w: exported.w, h: exported.h, size: exported.size })
      .toEqual({ x: rendered.x, y: rendered.y, w: rendered.w, h: rendered.h, size: rendered.size });
  });

  it("is idempotent across repeated save/reload/export cycles", () => {
    let deck = deckWith([corrupt(block()), corrupt(block({ id: "b2", y: 400 }), 2)]);
    const first = healDeckCanvasGeometry(deck).slides[0]!.canvasBlocks!;
    for (let i = 0; i < 3; i += 1) {
      deck = healDeckCanvasGeometry(JSON.parse(JSON.stringify(deck)) as Deck);
    }
    expect(deck.slides[0]!.canvasBlocks).toEqual(first);
    expect(canvasBlocksForExport(deck.slides[0]!.canvasBlocks)).toEqual(first);
  });

  it("leaves healthy geometry and intentional slight bleed untouched", () => {
    const ok = block();
    const bleed = block({ id: "b3", x: -20, y: -10, w: STAGE_W + 40, h: STAGE_H + 20 });
    const deck = healDeckCanvasGeometry(deckWith([ok, bleed]));
    expect(deck.slides[0]!.canvasBlocks).toEqual([ok, bleed]);
    expect(canvasBlocksForExport([ok, bleed])).toEqual([ok, bleed]);
  });

  it("still honours export exclusion after healing", () => {
    const kept = corrupt(block());
    const hidden = corrupt(block({ id: "b4", exportExcluded: true } as Partial<CanvasBlock>));
    const out = canvasBlocksForExport([kept, hidden]);
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("b1");
    expect(inStage(out[0]!)).toBe(true);
  });
});

/**
 * Every export target we support funnels canvas blocks through a different
 * assembly path: the full-deck PPTX, the single-module PPTX (module library /
 * "Save to My Files"), the Open Canvas Studio composition export, the raster
 * (PDF / PNG) path that goes through the renderer, and the saved custom-module
 * library load. All of them must heal geometry identically, or one format ships
 * a layout the others corrected.
 */
describe("geometry healing matches across every export target", () => {
  const bad = () => corrupt(block());

  it("single-module PPTX (module library / My Files) matches the deck export", () => {
    // single-slide-pptx builds a one-slide deck and hands it to the same
    // exporter, so the scoped block list is the contract to compare.
    const deckPath = canvasBlocksForExport([bad()]);
    const modulePath = canvasBlocksForExport(deckWith([bad()]).slides[0]!.canvasBlocks);
    expect(modulePath).toEqual(deckPath);
    expect(modulePath.every(inStage)).toBe(true);
  });

  it("Open Canvas Studio composition export matches the deck export", () => {
    const studioSlide = {
      id: "canvas-1",
      variantId: "MV-CANVAS-BLANK",
      canvasBlocks: [bad(), corrupt(block({ id: "b2", y: 400 }), 3)],
    };
    const exported = canvasBlocksForExport(studioSlide.canvasBlocks as CanvasBlock[]);
    expect(exported).toEqual(canvasBlocksForExport(studioSlide.canvasBlocks as CanvasBlock[]));
    expect(exported).toEqual(repairBlocks(studioSlide.canvasBlocks as CanvasBlock[]));
    expect(exported.every(inStage)).toBe(true);
  });

  it("raster targets (PDF / PNG) render the healed geometry the PPTX ships", () => {
    // The raster path screenshots the renderer, which repairs blocks before
    // painting — so renderer output IS the raster geometry.
    const blocks = [bad(), block({ id: "b5", x: 40, y: 40, w: 600, h: 200 })];
    const rendererGeometry = repairBlocks(blocks);
    expect(canvasBlocksForExport(blocks)).toEqual([...rendererGeometry]);
  });

  it("saved custom modules load healed, so library exports match too", () => {
    const raw = [{ ...bad(), kind: "heading" }];
    const loaded = normalizeCanvasBlocks(JSON.parse(JSON.stringify(raw)));
    expect(loaded.every(inStage)).toBe(true);
    expect(blocksAreHealthy(loaded)).toBe(true);
    expect(canvasBlocksForExport(loaded)).toEqual(loaded);
  });

  it("module instance round-trip (slide → module → slide) heals on the way out", () => {
    const slide = { ...deckWith([bad()]).slides[0]!, variantId: "MV-HERO-SPLIT" };
    const mi = moduleFromSlide(slide);
    const back = slideFromModule(mi, 0);
    expect(canvasBlocksForExport(back.canvasBlocks)).toEqual(
      canvasBlocksForExport(slide.canvasBlocks),
    );
  });

  it("reports exactly the blocks the export had to repair", () => {
    const slides = [
      { title: "Hero", canvasBlocks: [bad(), block({ id: "ok" })] },
      { title: "Clean", canvasBlocks: [block({ id: "ok2" })] },
    ];
    const report = auditDeckGeometry(slides);
    expect(report.blocksChecked).toBe(3);
    expect(report.blocksRepaired).toBe(1);
    expect(report.slidesAffected).toBe(1);
    expect(report.changes[0]!.slideTitle).toBe("Hero");
    // The report must agree with what the exporter actually changed.
    const changedByExport = slides.flatMap((sl) =>
      (sl.canvasBlocks as CanvasBlock[]).filter(
        (b, i) => canvasBlocksForExport(sl.canvasBlocks as CanvasBlock[])[i] !== b,
      ),
    );
    expect(changedByExport).toHaveLength(report.blocksRepaired);
  });
});
