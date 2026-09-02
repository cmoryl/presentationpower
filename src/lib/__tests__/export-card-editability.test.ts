/**
 * Module boxes must stay EDITABLE in PowerPoint.
 *
 * Two guards regressed the same symptom ("our boxes came back flattened into
 * the background"):
 *   1. `pruneOccludingPaint` treated a card's own decorative masked child
 *      layers (GlassTile's frosting + hairline) as plated content the card
 *      would occlude, so the card was dropped from the native layer.
 *   2. `isGhostPaint` / `keepBackgroundPaintOnPlate` read a capped fade-to-zero
 *      card tint as background wash.
 */
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import {
  isCardFade,
  isGhostPaint,
  keepBackgroundPaintOnPlate,
  pruneOccludingPaint,
} from "../export-dom-decompose";
import type { DomShape } from "../export-dom-decompose";

const SPACE = { w: 1920, h: 1080 };

function cardShape(part: Partial<DomShape> = {}): DomShape {
  return {
    kind: "roundRect",
    x: 120,
    y: 220,
    w: 820,
    h: 620,
    radiusPx: 22,
    fill: { hex: "003FC7", alpha: 0.16 },
    gradient: {
      angleDeg: 180,
      stops: [
        { pos: 0, color: { hex: "003FC7", alpha: 0.16 } },
        { pos: 0.55, color: { hex: "003FC7", alpha: 0.05 } },
        { pos: 1, color: { hex: "003FC7", alpha: 0 } },
      ],
    },
    line: null,
    shadow: null,
    name: "TP Panel",
    ...part,
  } as DomShape;
}

describe("module cards stay native", () => {
  it("recognises the house fade-to-zero card recipe", () => {
    expect(isCardFade(cardShape({ name: "TP Shape" }))).toBe(true);
    expect(isCardFade(cardShape({ name: "TP Shape", gradient: null }))).toBe(false);
  });

  it("does not treat a large capped-tint card as ghost paint", () => {
    expect(isGhostPaint(cardShape({ name: "TP Shape" }), SPACE)).toBe(false);
    expect(keepBackgroundPaintOnPlate([cardShape({ name: "TP Shape" })], SPACE)).toHaveLength(1);
  });

  it("keeps a card whose own decorative child layer stays on the plate", () => {
    const dom = new JSDOM(
      `<div id="card"><div data-decorative id="frost"></div><span>Copy</span></div>`,
    );
    const doc = dom.window.document;
    const card = doc.getElementById("card")!;
    const frost = doc.getElementById("frost")!;
    const shape = cardShape({ node: card } as Partial<DomShape>);
    expect(pruneOccludingPaint([shape], [frost])).toHaveLength(1);
  });

  it("still prunes a card sitting behind real plated content", () => {
    const dom = new JSDOM(`<div id="card"><img id="photo" /></div>`);
    const doc = dom.window.document;
    const card = doc.getElementById("card")!;
    const photo = doc.getElementById("photo")!;
    const shape = cardShape({ node: card } as Partial<DomShape>);
    expect(pruneOccludingPaint([shape], [photo])).toHaveLength(0);
  });
});
