import { describe, expect, it } from "vitest";
import { mapParsedSlide } from "../pptx-mapping";
import { baselineReinterpretation } from "../reinterpret-plan";
import { scoreSlideAccuracy } from "../reinterpret-accuracy";
import { variantItemImageCapacity, variantSupportsImagery } from "../variant-media";

const IMG = (n: number) => Array.from({ length: n }, (_, i) => `data:image/png;base64,AAAA${i}`);

function parsed(images: string[], bullets: string[] = []) {
  return {
    index: 1,
    title: "Our people around the world",
    bullets,
    notes: "",
    images,
    charts: [],
    tables: [],
    diagrams: [],
  } as never;
}

describe("imported imagery placement", () => {
  it("routes a picture-led slide onto a layout with real image slots", () => {
    const mapped = [
      mapParsedSlide(parsed([]), 2),
      mapParsedSlide(parsed(IMG(3), ["Regional teams", "Local knowledge"]), 2),
    ];
    const designed = baselineReinterpretation(mapped);
    const slide = designed[1];
    const slots =
      (variantSupportsImagery(slide.variantId) ? 1 : 0) + variantItemImageCapacity(slide.variantId);
    expect(slots).toBeGreaterThan(0);
    expect(scoreSlideAccuracy(slide).facets.find((f) => f.id === "media")!.score).toBeGreaterThan(
      0,
    );
  });

  it("counts item-level tile imagery toward the media facet", () => {
    const slide = {
      variantId: "MV-IMG-GRID-3",
      source: { index: 0, title: "T", bullets: [], notes: "", images: IMG(3) },
      content: { title: "T", items: IMG(3).map((mediaUrl) => ({ mediaUrl })) },
    } as never as Parameters<typeof scoreSlideAccuracy>[0];
    const media = scoreSlideAccuracy(slide).facets.find((f) => f.id === "media")!;
    expect(media.score).toBe(1);
  });
});
