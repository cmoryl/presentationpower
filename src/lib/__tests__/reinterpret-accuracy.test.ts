import { describe, expect, it } from "vitest";
import { scoreDeckAccuracy, scoreSlideAccuracy } from "../reinterpret-accuracy";
import type { MappedSlide } from "../pptx-mapping";
import type { ParsedSlide } from "../pptx-import";

function slide(partial: Partial<MappedSlide> & { source: Partial<ParsedSlide> }): MappedSlide {
  return {
    sectionId: "SF-05",
    variantId: "MV-INS-CALLOUT",
    layoutId: "L-01",
    content: { title: "Proof" },
    rationale: "test",
    ...partial,
    source: {
      index: 1,
      title: "Proof",
      bullets: [],
      notes: "",
      images: [],
      charts: [],
      tables: [],
      diagrams: [],
      ...partial.source,
    } as unknown as ParsedSlide,
  } as MappedSlide;
}

describe("scoreSlideAccuracy", () => {
  it("scores a fully represented slide at 100", () => {
    const a = scoreSlideAccuracy(
      slide({
        content: { title: "Proof", items: [{ label: "Delivery on time" }] } as never,
        source: { title: "Proof", bullets: ["Delivery on time"] },
      }),
    );
    expect(a.score).toBe(100);
    expect(a.band).toBe("high");
    expect(a.missing).toEqual([]);
  });

  it("drops the score and lists the missing lines when copy is left off", () => {
    const a = scoreSlideAccuracy(
      slide({
        content: { title: "Proof", items: [{ label: "Delivery on time" }] } as never,
        source: {
          bullets: ["Delivery on time", "Audio dubbing studios in eleven cities"],
        },
      }),
    );
    expect(a.score).toBeLessThan(90);
    expect(a.missing).toEqual(["Audio dubbing studios in eleven cities"]);
    expect(a.facets.find((f) => f.id === "copy")!.score).toBeCloseTo(0.5, 5);
  });

  it("credits continuation pages toward copy coverage", () => {
    const base = slide({
      content: { title: "Proof", items: [{ label: "Delivery on time" }] } as never,
      source: { bullets: ["Delivery on time", "Audio dubbing studios in eleven cities"] },
    });
    const withCont: MappedSlide = {
      ...base,
      continuations: [
        slide({
          content: { title: "Proof (cont.)", items: [{ label: "Audio dubbing studios in eleven cities" }] } as never,
          source: { bullets: [] },
        }),
      ],
    };
    expect(scoreSlideAccuracy(withCont).score).toBeGreaterThan(scoreSlideAccuracy(base).score);
    expect(scoreSlideAccuracy(withCont).missing).toEqual([]);
  });

  it("penalises dropped imagery", () => {
    const a = scoreSlideAccuracy(
      slide({
        content: { title: "Proof" } as never,
        source: { bullets: ["Delivery on time"], images: ["data:image/png;base64,AAA"] as never },
      }),
    );
    expect(a.facets.find((f) => f.id === "media")!.score).toBe(0);
    expect(a.score).toBeLessThan(100);
  });

  it("rolls up a deck average and flags the worst slide", () => {
    const good = slide({
      content: { title: "Proof", items: [{ label: "Delivery on time" }] } as never,
      source: { index: 0, bullets: ["Delivery on time"] },
    });
    const bad = slide({
      content: { title: "Empty" } as never,
      source: { index: 1, title: "Very different heading words", bullets: ["Nothing here landed at all"] },
    });
    const roll = scoreDeckAccuracy([good, bad]);
    expect(roll.worst!.index).toBe(1);
    expect(roll.average).toBeLessThan(100);
    expect(roll.lowCount).toBe(1);
  });
});
