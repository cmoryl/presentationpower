// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import type { CanvasBlock } from "./deck-store";
import {
  canvasBlockFrameStyle,
  canvasBlockTextStyle,
  canvasTextFromEditable,
} from "@/components/slide/CanvasBlockView";
import { clientPointToStage, stageScaleFromRect } from "./canvas-snap";
import {
  canvasBlockRectIn,
  describeCanvasBlockText,
  parseCssColorToPptx,
  placeCanvasBlocks,
} from "./export-canvas-blocks";

function block(over: Partial<CanvasBlock>): CanvasBlock {
  return { id: "b", kind: "body", x: 0, y: 0, w: 400, h: 200, text: "Hello", ...over };
}

function fakeSlide() {
  const calls: Array<{ fn: string; args: unknown[] }> = [];
  const slide = {
    addText: (...args: unknown[]) => calls.push({ fn: "addText", args }),
    addShape: (...args: unknown[]) => calls.push({ fn: "addShape", args }),
    addImage: (...args: unknown[]) => calls.push({ fn: "addImage", args }),
  };
  return { slide, calls };
}

describe("canvas block export geometry", () => {
  it("uses one reversible transform at every editor size", () => {
    for (const rect of [
      { left: 32, top: 90, width: 640, height: 360 },
      { left: 0, top: 0, width: 1280, height: 720 },
      { left: 150, top: 40, width: 960, height: 540 },
    ]) {
      expect(stageScaleFromRect(rect)).toBeCloseTo(rect.width / 1920, 8);
      expect(clientPointToStage(rect.left + rect.width * 0.5, rect.top + rect.height * 0.25, rect))
        .toEqual({ x: 960, y: 270 });
    }
  });

  it("maps stage units to slide inches", () => {
    const r = canvasBlockRectIn(block({ x: 960, y: 540, w: 480, h: 270 }));
    expect(r.x).toBeCloseTo(6.6665, 3);
    expect(r.y).toBeCloseTo(3.75, 3);
    expect(r.w).toBeCloseTo(3.33325, 3);
    expect(r.h).toBeCloseTo(1.875, 3);
  });

  it("converts editor typography to points", () => {
    const heading = block({ kind: "heading", text: "Title" });
    const t = describeCanvasBlockText(heading, "#0B0B12")!;
    const css = canvasBlockTextStyle(heading, "#0B0B12");
    expect(t.fontSize).toBeCloseTo(48, 1); // 96px stage → 48pt
    expect(t.bold).toBe(true);
    expect(t.lineSpacing).toBeCloseTo(48 * 1.02, 1);
    expect(t.charSpacing).toBeCloseTo(-0.03 * 48, 2);
    expect(css.lineHeight).toBe(1.02);
    expect(css.letterSpacing).toBe("-0.03em");
    expect(css.fontWeight).toBe(700);
  });

  it("keeps editor frame percentages and PPTX positions on the same coordinates", () => {
    const b = block({ x: 384, y: 216, w: 960, h: 432 });
    const css = canvasBlockFrameStyle(b);
    const pptx = canvasBlockRectIn(b);
    expect(css.left).toBe("20%");
    expect(css.top).toBe("20%");
    expect(css.width).toBe("50%");
    expect(css.height).toBe("40%");
    expect(pptx.x / 13.333).toBeCloseTo(0.2, 5);
    expect(pptx.y / 7.5).toBeCloseTo(0.2, 5);
    expect(pptx.w / 13.333).toBeCloseTo(0.5, 5);
    expect(pptx.h / 7.5).toBeCloseTo(0.4, 5);
  });

  it("preserves explicit lines from object text editing", () => {
    const root = document.createElement("div");
    root.innerHTML = "First line<div>Second line<br>Third line</div>";
    expect(canvasTextFromEditable(root)).toBe("First line\nSecond line\nThird line");
  });

  it("parses rgba fills", () => {
    expect(parseCssColorToPptx("rgba(255,255,255,0.16)")).toEqual({ hex: "FFFFFF", alpha: 0.16 });
    expect(parseCssColorToPptx("#003FC7")).toEqual({ hex: "003FC7", alpha: 1 });
  });
});

describe("placeCanvasBlocks", () => {
  it("emits blocks in z-order with glass surfaces", () => {
    const { slide, calls } = fakeSlide();
    const placed = placeCanvasBlocks(
      slide as never,
      [
        block({ id: "top", kind: "heading", z: 2, text: "Headline" }),
        block({ id: "under", kind: "shape", z: 1, w: 800, h: 400, fill: "rgba(255,255,255,0.16)" }),
      ],
      { dark: false, accent: "003FC7", inkHex: "#0B0B12" },
    );
    expect(placed).toBe(2);
    expect(calls.map((c) => c.fn)).toEqual(["addShape", "addText"]);
    const shapeOpts = calls[0].args[1] as Record<string, unknown>;
    expect(shapeOpts.rectRadius).toBeGreaterThan(0);
    // Glass upgrade rides in the object name as gradient + ambient tags.
    expect(String(shapeOpts.objectName)).toMatch(/\[gf:/);
    expect(shapeOpts.shadow).toBeTruthy();
  });

  it("emits images with rounded crop and fit", () => {
    const { slide, calls } = fakeSlide();
    placeCanvasBlocks(
      slide as never,
      [block({ kind: "image", src: "data:image/png;base64,AAA", fit: "contain", w: 600, h: 400 })],
      { dark: true, accent: "A1FBF9", inkHex: "#FFFFFF" },
    );
    const o = calls[0].args[0] as Record<string, unknown>;
    expect(String(o.objectName)).toMatch(/\[r:\d+\]/);
    expect((o.sizing as { type: string }).type).toBe("contain");
  });
});

describe("layers panel export scope", () => {
  it("omits export-excluded layers", () => {
    const { slide, calls } = fakeSlide();
    const placed = placeCanvasBlocks(
      slide as never,
      [
        block({ id: "keep", text: "In scope" }),
        block({ id: "drop", text: "Out of scope", exportExcluded: true }),
      ],
      { dark: false, accent: "003FC7", inkHex: "#0B0B12" },
    );
    expect(placed).toBe(1);
    expect(String((calls[0].args[0] as string) ?? "")).toBe("In scope");
  });

  it("tags grouped layers so they land as one PowerPoint group", () => {
    const { slide, calls } = fakeSlide();
    placeCanvasBlocks(
      slide as never,
      [
        block({ id: "a", kind: "shape", z: 1, groupId: "g1", fill: "#FFFFFF" }),
        block({ id: "b", kind: "heading", z: 2, groupId: "g1", text: "Card" }),
        block({ id: "c", kind: "body", z: 3, text: "Loose" }),
      ],
      { dark: false, accent: "003FC7", inkHex: "#0B0B12" },
    );
    const names = calls.map((c) =>
      String(((c.args[1] ?? c.args[0]) as Record<string, unknown>).objectName ?? ""),
    );
    expect(names[0]).toMatch(/^\[g:g1\|/);
    expect(names[1]).toMatch(/^\[g:g1\|/);
    expect(names[2]).not.toMatch(/^\[g:/);
  });
});
