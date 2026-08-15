import { describe, expect, it } from "vitest";
import {
  NEUTRAL_FILL,
  clampFill,
  computeFill,
  fillCssVars,
  fillFamilyFor,
  fillPx,
  fillSpaceScale,
  measureLoad,
  relaxFill,
} from "../open-space-fill";

const sparseCover = { title: "One system", kicker: "2026" };
const fullContent = {
  title: "How the localization program compounds value across every market we serve today",
  subtitle: "A three-year view of throughput, quality and cost per word across 14 languages",
  bullets: [
    "Automated intake removes eleven manual handoffs from the request path every single week",
    "Translation memory reuse climbs from thirty-one percent to sixty-four percent by year two",
    "Quality review moves from sampling to full coverage without adding reviewer headcount",
    "Cost per word falls while volume roughly triples across the same delivery window",
  ],
  cards: [
    { title: "Intake", body: "One queue for every requesting team and channel" },
    { title: "Produce", body: "Machine first, human review where the risk sits" },
    { title: "Publish", body: "Automated delivery back into each source system" },
  ],
};

describe("open-space auto-fill", () => {
  it("reads a sparse page as open space and a dense page as full", () => {
    const sparse = measureLoad(sparseCover);
    const full = measureLoad(fullContent);
    expect(sparse.load).toBeLessThan(0.2);
    expect(full.load).toBeGreaterThan(0.9);
    expect(full.items).toBe(7);
    expect(measureLoad(undefined).load).toBe(0);
  });

  it("counts imagery as spent space", () => {
    const withImage = measureLoad({ ...sparseCover, image: { path: "a.jpg" } });
    expect(withImage.visual).toBe(true);
    expect(withImage.load).toBeGreaterThan(measureLoad(sparseCover).load);
  });

  it("ignores urls and asset paths when counting words", () => {
    const load = measureLoad({
      title: "Two words",
      background: { path: "backdrops/aurora-eight-wide-tile.jpg", url: "https://x/y.jpg" },
    });
    expect(load.words).toBe(2);
  });

  it("grows a sparse cover headline and leaves a full page alone", () => {
    const grown = computeFill({ content: sparseCover, variantId: "SF-01-COVER" });
    expect(grown.family).toBe("cover");
    expect(grown.display).toBeGreaterThan(1.15);
    expect(grown.gap).toBeGreaterThan(1);

    const neutral = computeFill({ content: fullContent, variantId: "SF-12-CONTENT" });
    expect(neutral.display).toBeLessThanOrEqual(1.03);
    expect(neutral.body).toBeLessThanOrEqual(1.03);
  });

  it("tightens gaps before type when a page is over-full", () => {
    const crowded = computeFill({
      content: { ...fullContent, extra: Array.from({ length: 14 }, (_, i) => `Item ${i} of the row`) },
      variantId: "SF-20-GRID",
    });
    expect(crowded.load).toBeGreaterThan(1);
    expect(crowded.gap).toBeLessThan(crowded.body);
    expect(crowded.body).toBeGreaterThanOrEqual(0.92);
    expect(crowded.display).toBeGreaterThanOrEqual(0.9);
  });

  it("grows charts on the block axis for chart families", () => {
    const chart = computeFill({ content: { title: "Growth", spec: { kind: "bar" } }, variantId: "MV-DASH-TREND" });
    expect(chart.family).toBe("chart");
    expect(chart.block).toBeGreaterThan(chart.display);
  });

  it("never exceeds the safe caps, whatever the input", () => {
    for (const content of [sparseCover, fullContent, {}, { title: "" }]) {
      for (const variantId of ["SF-01-COVER", "MV-STAT-ROW", "SF-20-GRID", null]) {
        const f = computeFill({ content, variantId, density: 0.2 });
        expect(f.display).toBeLessThanOrEqual(1.26);
        expect(f.block).toBeLessThanOrEqual(1.34);
        expect(f.gap).toBeGreaterThanOrEqual(0.82);
      }
    }
  });

  it("damps growth when the skin scaffold already fills the sheet", () => {
    const airy = computeFill({ content: sparseCover, variantId: "SF-01-COVER", density: 0.5 });
    const dense = computeFill({ content: sparseCover, variantId: "SF-01-COVER", density: 0.85 });
    expect(dense.display).toBeLessThan(airy.display);
  });

  it("respects the off switch", () => {
    const off = computeFill({ content: sparseCover, variantId: "SF-01-COVER", enabled: false });
    expect(off.display).toBe(1);
    expect(off.gap).toBe(1);
  });

  it("relaxes back toward the authored scale, gaps first", () => {
    const grown = computeFill({ content: sparseCover, variantId: "SF-01-COVER" });
    const half = relaxFill(grown, 0.5);
    expect(half.display).toBeLessThan(grown.display);
    expect(half.display).toBeGreaterThan(1);
    const none = relaxFill(grown, 1);
    expect(none.display).toBe(1);
    expect(none.gap).toBeLessThan(1);
  });

  it("maps module ids to families", () => {
    expect(fillFamilyFor("SF-01-COVER")).toBe("cover");
    expect(fillFamilyFor("MV-QUOTE-BIG")).toBe("statement");
    expect(fillFamilyFor("MV-STAT-TRIO")).toBe("stats");
    expect(fillFamilyFor("MV-BENTO-5")).toBe("grid");
    expect(fillFamilyFor(undefined)).toBe("content");
  });

  it("publishes css vars including a re-based spacing unit", () => {
    const vars = fillCssVars(clampFill({ ...NEUTRAL_FILL, gap: 1.25 }));
    expect(vars["--fill-display"]).toBe("1");
    expect(vars["--spacing"]).toBe(`calc(0.25rem * ${fillSpaceScale({ ...NEUTRAL_FILL, gap: 1.25 })})`);
    expect(fillSpaceScale({ ...NEUTRAL_FILL, gap: 1.25 })).toBeLessThanOrEqual(1.1);
    expect(fillPx(24, "body")).toBe("calc(24px * var(--fill-body, 1))");
  });
});
