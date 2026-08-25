// @vitest-environment jsdom
/**
 * Regression: the two defects that made exported decks diverge from the build —
 *  1. adopted canvas mirrors shipping TWICE (module glyphs + native mirror),
 *  2. tracked eyebrows wrapping to a second line and colliding with the title.
 */
import { describe, expect, it } from "vitest";

import { canvasBlocksForExport } from "../export-canvas-blocks";
import { hideAdoptedSourcesIn, isDroppableAdoptedMirror } from "../export-adopted-hide";
import { describeTextRun } from "../pptx-text-props";
import type { CanvasBlock } from "../deck-store";
import type { TextRun } from "../export-text-layer";

function block(over: Partial<CanvasBlock>): CanvasBlock {
  return {
    id: over.id ?? "b1",
    kind: "heading",
    x: 100,
    y: 100,
    w: 600,
    h: 120,
    ...over,
  } as CanvasBlock;
}

function run(over: Partial<TextRun>): TextRun {
  return {
    x: 96,
    y: 80,
    w: 400,
    h: 26,
    text: "SAMPLE",
    fontSizePx: 20,
    fontFamily: "Geist",
    bold: false,
    italic: false,
    underline: false,
    color: "003fc7",
    transparency: 0,
    align: "left",
    lineHeightPx: 26,
    letterSpacingPx: 0,
    singleLine: true,
    valign: "top",
    paragraph: {
      textIndentPx: 0,
      padLeftPx: 0,
      padRightPx: 0,
      spaceBeforePx: 0,
      spaceAfterPx: 0,
      whiteSpace: "normal",
      overflowWrap: "normal",
      hyphens: "none",
      listMarker: null,
    },
    ...over,
  } as TextRun;
}

describe("adopted mirrors at export", () => {
  it("drops untouched adopted shape mirrors (the stray plate blobs)", () => {
    const plate = block({ id: "plate", kind: "shape", sourceSelector: ":nth-child(2)" });
    expect(isDroppableAdoptedMirror(plate)).toBe(true);
    expect(canvasBlocksForExport([plate]).map((b) => b.id)).not.toContain("plate");
  });

  it("keeps adopted TEXT mirrors and anything the user touched", () => {
    const text = block({
      id: "t",
      kind: "heading",
      text: "Live Demo",
      sourceSelector: ":nth-child(1)",
    });
    const moved = block({ id: "m", kind: "shape", sourceSelector: ":nth-child(3)", touched: true });
    expect(isDroppableAdoptedMirror(text)).toBe(false);
    expect(isDroppableAdoptedMirror(moved)).toBe(false);
    const ids = canvasBlocksForExport([text, moved]).map((b) => b.id);
    expect(ids).toContain("t");
    expect(ids).toContain("m");
  });

  it("hides the source element of a kept text mirror so it is not captured twice", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div><h2 data-x="1">Live Demo</h2></div>`;
    const h2 = root.querySelector("h2") as HTMLElement;
    const restore = hideAdoptedSourcesIn(root, [
      block({ id: "t", text: "Live Demo", sourceSelector: "div > h2" }),
    ]);
    expect(h2.style.visibility).toBe("hidden");
    restore();
    expect(h2.style.visibility).toBe("");
  });

  it("leaves the source visible for dropped mirrors (module still paints it)", () => {
    const root = document.createElement("div");
    root.innerHTML = `<div><span>plate</span></div>`;
    const span = root.querySelector("span") as HTMLElement;
    hideAdoptedSourcesIn(root, [block({ id: "p", kind: "shape", sourceSelector: "div > span" })]);
    expect(span.style.visibility).toBe("");
  });
});

describe("single-line fit", () => {
  it("shrinks a tracked eyebrow that would wrap instead of letting it overflow", () => {
    const wide = describeTextRun(
      run({
        x: 1200,
        w: 620,
        text: "CONFIDENTIAL · INTERNAL PREVIEW · ELEMENT PLATFORM",
        letterSpacingPx: 3,
        fontSizePx: 22,
      }),
    )!;
    // Stage px → pt is 0.5, so an unshrunk 22px eyebrow would be 11pt.
    expect(wide.fontSize).toBeLessThan(11 * 0.85);
    // Still on the slide.
    expect((wide.x as number) + (wide.w as number)).toBeLessThanOrEqual(13.34);
  });

  it("does not shrink a line that already fits", () => {
    const ok = describeTextRun(run({ x: 96, w: 300, text: "OVERVIEW", fontSizePx: 20 }))!;
    expect(ok.fontSize).toBe(10);
  });
});
