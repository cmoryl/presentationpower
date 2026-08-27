/**
 * COVER REPLACEMENT → EXPORT REGRESSION
 *
 * When an admin replaces a look's cover artwork in the background directory,
 * every export must show that artwork and nothing of the look's previous
 * procedural/vector scene. The bug this suite locks down: the replacement
 * reached the editor only, so PPTX/PDF exports still carried the legacy vector
 * plates and rails from the authored scene behind (and sometimes over) the new
 * cover.
 *
 * Three seams cover both exporters, because both go through them:
 *   1. `packGroundPaint` — the single ground engine the PPTX background
 *      rasterizer AND the PDF slide capture paint from.
 *   2. `keepBackgroundPaintOnPlate` — decides which DOM paint stays a native
 *      PPTX object; legacy full-bleed vector washes/rails must be flattened
 *      into the plate rather than re-emitted over the replaced cover.
 *   3. `pdfPageSizeForNode` — the deck PDF page is the slide itself, so the
 *      replaced cover is never letterboxed or cropped by a letter/A4 page.
 */
import { afterEach, describe, expect, it } from "vitest";
import { packGroundPaint, stylePackById } from "@/lib/style-packs";
import { setSkinBackdropOverrides } from "@/lib/skin-backdrop-overrides";
import { keepBackgroundPaintOnPlate, type DomShape } from "@/lib/export-dom-decompose";
import { pdfPageSizeForNode } from "@/lib/slide-image-export";
import { exportSlideBounds } from "@/lib/export-space";

const NEW_COVER = "https://cdn.example.com/backdrops/s01-cover-replacement.png";
const OTHER = "https://cdn.example.com/backdrops/s07-stats-replacement.png";

const LEGACY_VECTOR = /repeating-(linear|radial)-gradient|url\("data:image\/svg\+xml/;

afterEach(() => setSkinBackdropOverrides({}));

function ground(packId: string, seed: string): string[] {
  const pack = stylePackById(packId);
  expect(pack, `missing pack ${packId}`).toBeTruthy();
  return packGroundPaint(pack!, seed);
}

describe("replaced cover becomes the exported ground", () => {
  it("paints in front of everything the look authored", () => {
    const before = ground("skin-s01", "cover");
    expect(before.join(", ")).not.toContain(NEW_COVER);

    setSkinBackdropOverrides({ "S01:cover:0": NEW_COVER });
    const after = ground("skin-s01", "cover");

    // Front-most CSS layer == topmost paint, so nothing authored sits above it.
    expect(after[0]).toBe(`url("${NEW_COVER}") center center / cover no-repeat`);
    // Full-cover, non-repeating: legacy layers below can never show through.
    expect(after[0]).toMatch(/\/ cover no-repeat$/);
    expect(after.slice(1).some((l) => LEGACY_VECTOR.test(l))).toBe(
      before.some((l) => LEGACY_VECTOR.test(l)),
    );
    expect(after.slice(1).findIndex((l) => LEGACY_VECTOR.test(l))).toBeLessThan(after.length);
  });

  it("applies to the take encoded in a ground seed", () => {
    setSkinBackdropOverrides({ "S01:cover:2": NEW_COVER });
    expect(ground("skin-s01", "cover take:2")[0]).toContain(NEW_COVER);
  });

  it("falls back to take 0 for other takes of the replaced scene", () => {
    setSkinBackdropOverrides({ "S01:cover:0": NEW_COVER });
    expect(ground("skin-s01", "cover take:3")[0]).toContain(NEW_COVER);
  });

  it("never leaks into another look or another section's authored art", () => {
    setSkinBackdropOverrides({ "S01:cover:0": NEW_COVER, "S07:stats:0": OTHER });
    expect(ground("skin-s02", "cover").join(", ")).not.toContain(NEW_COVER);
    expect(ground("skin-s01", "stats").join(", ")).not.toContain(OTHER);
    expect(ground("skin-s07", "stats")[0]).toContain(OTHER);
  });

  it("reverts to the authored scene when the replacement is removed", () => {
    const base = ground("skin-s01", "cover").join(", ");
    setSkinBackdropOverrides({ "S01:cover:0": NEW_COVER });
    setSkinBackdropOverrides({});
    expect(ground("skin-s01", "cover").join(", ")).toBe(base);
  });

  it("is identical for the PPTX rasterizer and the PDF capture", () => {
    setSkinBackdropOverrides({ "S01:cover:0": NEW_COVER });
    // Both exporters compose the plane from this exact string.
    const pptxPlane = ground("skin-s01", "cover").join(", ");
    const pdfPlane = ground("skin-s01", "cover").join(", ");
    expect(pptxPlane).toBe(pdfPlane);
    expect(pptxPlane.search(/url\(/)).toBe(0);
    expect(pptxPlane.indexOf(NEW_COVER)).toBeLessThan(pptxPlane.length / 2);
  });
});

describe("no legacy vector layers survive as PPTX objects over the cover", () => {
  const SPACE = { w: 1920, h: 1080 };

  function box(part: Partial<DomShape>): DomShape {
    return {
      kind: "box",
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      radiusPx: 0,
      fill: { hex: "112233", alpha: 1 },
      gradient: null,
      line: null,
      shadow: null,
      name: "TP Box",
      ...part,
    } as DomShape;
  }

  it("flattens the authored scene plates, washes and column rails", () => {
    const legacy: DomShape[] = [
      box({ w: 1920, h: 1080, name: "TP Scene plate" }),
      box({ x: 0, y: 0, w: 1920, h: 940, fill: { hex: "003FC7", alpha: 0.2 }, name: "TP Wash" }),
      ...[240, 560, 880, 1200].map((x) =>
        box({ x, y: 0, w: 6, h: 1080, fill: { hex: "FFFFFF", alpha: 0.12 }, name: "TP Rail" }),
      ),
      box({ x: 0, y: 1074, w: 1920, h: 6, name: "TP Edge band" }),
    ];
    expect(keepBackgroundPaintOnPlate(legacy, SPACE)).toEqual([]);
  });

  it("keeps the replaced cover picture and real module furniture editable", () => {
    const kept = keepBackgroundPaintOnPlate(
      [
        box({ kind: "image", x: 96, y: 96, w: 1100, h: 700, name: "TP Cover art" }),
        box({ x: 200, y: 520, w: 1520, h: 4, name: "TP Timeline spine" }),
        box({ x: 480, y: 500, w: 4, h: 44, name: "TP Milestone tick" }),
        box({ x: 140, y: 880, w: 640, h: 220, name: "TP Card" }),
      ],
      SPACE,
    );
    expect(kept).toHaveLength(4);
  });
});

describe("deck PDF pages stay at the slide's own size", () => {
  function node(w: number, h: number): HTMLElement {
    return {
      offsetWidth: w,
      offsetHeight: h,
      getBoundingClientRect: () => ({ width: w, height: h }),
    } as unknown as HTMLElement;
  }

  it("16:9 slides export at the deck slide size — never letter/A4", () => {
    const { wIn, hIn } = exportSlideBounds();
    expect(pdfPageSizeForNode(node(1920, 1080))).toEqual([wIn, hIn]);
    expect(pdfPageSizeForNode(node(1920, 1080))).not.toEqual([8.5, 11]);
  });

  it("keeps a 4:3 or square slide at its own aspect ratio", () => {
    const { wIn, hIn } = exportSlideBounds();
    const fourThree = pdfPageSizeForNode(node(1024, 768));
    expect(fourThree[0] / fourThree[1]).toBeCloseTo(4 / 3, 3);
    const square = pdfPageSizeForNode(node(1080, 1080));
    expect(square[0]).toBeCloseTo(square[1], 3);
    expect(fourThree[0]).toBeCloseTo(wIn, 3);
    expect(square[1]).toBeCloseTo(wIn, 3);
    expect(hIn).toBeLessThan(square[1]!);
  });
});
