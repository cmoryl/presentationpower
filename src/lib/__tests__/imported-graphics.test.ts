import { describe, expect, it } from "vitest";
import {
  classifyVisualSignal,
  rehydrateStoredGraphics,
  extractFigures,
} from "@/lib/imported-graphics";
import { applyVisualOverrides, shouldRenderFaithfully } from "@/lib/imported-to-deck";
import type { MappedSlide } from "@/lib/pptx-mapping";

const chartAssets = {
  charts: [
    {
      kind: "bar",
      title: "Availability by region",
      categories: ["EMEA", "APAC", "AMER"],
      series: [{ label: "Uptime", values: [99.98, 99.9, 99.95] }],
      unit: "%",
    },
  ],
};

describe("imported graphics rehydration", () => {
  it("rebuilds charts with their plotted values", () => {
    const g = rehydrateStoredGraphics(chartAssets as never);
    expect(g.charts).toHaveLength(1);
    expect(g.charts[0].series[0].values).toEqual([99.98, 99.9, 99.95]);
  });

  it("drops charts that carry no values", () => {
    const g = rehydrateStoredGraphics({
      charts: [{ kind: "bar", categories: ["a"], series: [{ label: "x", values: [] }] }],
    } as never);
    expect(g.charts).toHaveLength(0);
  });

  it("classifies structured data, stripped charts, pictures and copy figures", () => {
    expect(classifyVisualSignal({ index: 0, assets: chartAssets as never }).kind).toBe("structured");
    expect(
      classifyVisualSignal({
        index: 1,
        assets: { charts: [{ kind: "bar", series: [] }] } as never,
      }).kind,
    ).toBe("stripped");
    expect(
      classifyVisualSignal({
        index: 2,
        title: "Performance dashboard",
        imageCount: 1,
      }).kind,
    ).toBe("image-graphic");
    expect(
      classifyVisualSignal({ index: 3, bullets: ["99.98% uptime", "$284K saved"] }).kind,
    ).toBe("stat-copy");
    expect(classifyVisualSignal({ index: 4, bullets: ["We partner closely"] }).kind).toBe("none");
  });

  it("extracts plottable figures from copy", () => {
    expect(extractFigures(["99.98% uptime across 14 markets"])).toContain("99.98%");
  });

  it("never freezes a slide that holds real chart data as a picture", () => {
    expect(
      shouldRenderFaithfully({
        index: 0,
        title: "Slide 4",
        bullets: [],
        layout: { shapes: [{ kind: "image", path: "x" }] },
        assets: chartAssets,
      } as never),
    ).toBe(false);
  });
});

describe("accepted visual overrides", () => {
  const base = [
    {
      sectionId: "sec-proof",
      variantId: "MV-COPY-BULLETS",
      layoutId: "layout-full",
      content: { title: "Old", faithfulImport: true, importedDeckId: "d1" },
      source: { index: 2 },
    },
  ] as unknown as MappedSlide[];

  it("swaps the module, merges content and clears faithful-import flags", () => {
    const out = applyVisualOverrides(base, {
      2: { variantId: "MV-VIZ-BAR", content: { title: "Uptime", bars: [{ label: "EMEA", value: 99.98 }] } },
    });
    expect(out[0].variantId).toBe("MV-VIZ-BAR");
    expect(out[0].content.bars).toHaveLength(1);
    expect(out[0].content.faithfulImport).toBeUndefined();
    expect(out[0].content.importedDeckId).toBeUndefined();
  });

  it("leaves slides without an accepted proposal untouched", () => {
    expect(applyVisualOverrides(base, {})[0].variantId).toBe("MV-COPY-BULLETS");
  });
});
