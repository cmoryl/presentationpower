import { describe, expect, it } from "vitest";

import { collapseMediaOverlays, type DomShape } from "../export-dom-decompose";

const SPACE = { w: 1920, h: 1080 };

function shape(p: Partial<DomShape>): DomShape {
  return {
    kind: "rect",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    radiusPx: 0,
    fill: null,
    gradient: null,
    line: null,
    shadow: null,
    rotationDeg: 0,
    name: "TP Shape",
    ...p,
  } as DomShape;
}

/** A bento media tile: photo + wash + top scrim + bottom scrim. */
function bento() {
  const photo = shape({
    kind: "image",
    name: "TP Image",
    x: 100,
    y: 100,
    w: 800,
    h: 600,
    radiusPx: 24,
    src: "data:image/png;base64,x",
  });
  const wash = shape({ x: 100, y: 100, w: 800, h: 600, fill: { hex: "03002C", alpha: 0.25 } });
  const topScrim = shape({
    x: 100,
    y: 100,
    w: 800,
    h: 240,
    gradient: {
      angleDeg: 180,
      stops: [
        { pos: 0, color: { hex: "03002C", alpha: 0.7 } },
        { pos: 1, color: { hex: "03002C", alpha: 0 } },
      ],
    },
  });
  const bottomScrim = shape({
    x: 100,
    y: 460,
    w: 800,
    h: 240,
    fill: { hex: "03002C", alpha: 0.35 },
  });
  return { photo, wash, topScrim, bottomScrim };
}

describe("collapseMediaOverlays", () => {
  it("replaces a scrim stack with exactly one alpha overlay over the picture", () => {
    const { photo, wash, topScrim, bottomScrim } = bento();
    const out = collapseMediaOverlays([photo, wash, topScrim, bottomScrim], SPACE);

    expect(out).toHaveLength(2);
    expect(out[0]).toBe(photo);
    const overlay = out[1]!;
    expect(overlay.name).toBe("TP Image overlay");
    expect(overlay.kind).toBe("roundRect");
    expect(overlay.radiusPx).toBe(photo.radiusPx);
    // Union of the three layers, clipped to the picture.
    expect(overlay).toMatchObject({ x: 100, y: 100, w: 800, h: 600 });
    // The designed fade wins, densified by the flat tints it absorbed.
    expect(overlay.gradient?.stops).toHaveLength(2);
    expect(overlay.gradient!.stops[0]!.color.alpha).toBeGreaterThan(0.7);
    expect(overlay.gradient!.stops[1]!.color.alpha).toBeGreaterThan(0);
    expect(overlay.gradient!.stops[1]!.color.alpha).toBeLessThan(1);
  });

  it("keeps text, bordered chips and opaque blocks as their own objects", () => {
    const { photo, wash } = bento();
    const captionNode = { textContent: "38% launch time" } as unknown as Element;
    const caption = shape({
      node: captionNode,
      x: 140,
      y: 560,
      w: 400,
      h: 80,
      fill: { hex: "FFFFFF", alpha: 0.6 },
      name: "TP Caption pad",
    });
    const chip = shape({
      x: 140,
      y: 140,
      w: 120,
      h: 40,
      fill: { hex: "FFFFFF", alpha: 0.2 },
      line: { hex: "FFFFFF", alpha: 0.4, widthPx: 1 },
      name: "TP Chip",
    });
    const opaque = shape({
      x: 700,
      y: 140,
      w: 120,
      h: 40,
      fill: { hex: "003FC7", alpha: 1 },
      name: "TP Badge",
    });

    const out = collapseMediaOverlays([photo, wash, caption, chip, opaque], SPACE);
    const names = out.map((s) => s.name);
    expect(names).toContain("TP Caption pad");
    expect(names).toContain("TP Chip");
    expect(names).toContain("TP Badge");
    expect(names.filter((n) => n.endsWith("overlay"))).toHaveLength(1);
  });

  it("composites flat tints into a single alpha when there is no gradient", () => {
    const { photo } = bento();
    const a = shape({ x: 100, y: 100, w: 800, h: 600, fill: { hex: "03002C", alpha: 0.3 } });
    const b = shape({ x: 100, y: 100, w: 800, h: 600, fill: { hex: "03002C", alpha: 0.3 } });
    const out = collapseMediaOverlays([photo, a, b], SPACE);
    expect(out).toHaveLength(2);
    // 0.3 over 0.3 = 0.51, not two stacked blocks.
    expect(out[1]!.fill!.alpha).toBeCloseTo(0.51, 2);
    expect(out[1]!.gradient).toBeNull();
  });

  it("leaves shapes that are not over a picture untouched", () => {
    const card = shape({ x: 0, y: 0, w: 600, h: 400, fill: { hex: "FFFFFF", alpha: 0.4 } });
    const tint = shape({ x: 20, y: 20, w: 200, h: 100, fill: { hex: "FFFFFF", alpha: 0.2 } });
    expect(collapseMediaOverlays([card, tint], SPACE)).toEqual([card, tint]);
  });

  it("ignores icon-sized pictures so logo washes are not merged away", () => {
    const icon = shape({ kind: "image", x: 40, y: 40, w: 90, h: 40, src: "d" });
    const tint = shape({ x: 40, y: 40, w: 90, h: 40, fill: { hex: "000000", alpha: 0.2 } });
    expect(collapseMediaOverlays([icon, tint], SPACE)).toHaveLength(2);
    expect(collapseMediaOverlays([icon, tint], SPACE)[1]!.name).toBe("TP Shape");
  });

  it("carries every merged element so none of them double-paint on the plate", () => {
    const nodes = [0, 1, 2].map((i) => ({ textContent: "", id: `l${i}` }) as unknown as Element);
    const { photo } = bento();
    const layers = nodes.map((node, i) =>
      shape({
        node,
        x: 100,
        y: 100 + i,
        w: 800,
        h: 600 - i,
        fill: { hex: "03002C", alpha: 0.2 },
      }),
    );
    const overlay = collapseMediaOverlays([photo, ...layers], SPACE)[1]!;
    const owned = [overlay.node, ...(overlay.nodes ?? [])];
    expect(owned).toHaveLength(3);
    expect(new Set(owned).size).toBe(3);
  });
});
