/**
 * Combination coverage for the layout arbiter.
 *
 * The third axis the older conformance suites never crossed: section framework.
 * Here every section × level × canvas aspect × content shape is arbitrated, and
 * each combination has to produce at least one FEASIBLE ranked candidate with a
 * deterministic score — so there is no brief the system answers with "nothing
 * fits" or with an arbitrary pick.
 */

import { describe, expect, it } from "vitest";
import { arbitrateLayout, bestLayoutVariant, layoutFits } from "../layout-arbiter";
import { TEMPLATE_LEVELS, levelsForSection } from "../section-templates";
import { BRAND_MODES, SECTION_FRAMEWORKS } from "../taxonomy";

const CANVASES = [
  { width: 16, height: 9 },
  { width: 16, height: 10 },
  { width: 4, height: 3 },
];

const SHAPES = [
  { name: "sparse headline", content: { title: "One idea, at full voice" } },
  {
    name: "working body",
    content: {
      title: "How the programme works",
      body: "Three connected workstreams run in parallel across the first two quarters.",
      items: [1, 2, 3],
    },
  },
  {
    name: "kpi wall",
    content: { title: "Results", items: [1, 2, 3, 4], body: "Measured against the FY baseline." },
  },
  {
    name: "over-full appendix",
    content: {
      title: "Full comparison of every vendor across all evaluated capability areas and regions",
      body: "x ".repeat(200),
      items: Array.from({ length: 14 }, (_, i) => i),
    },
  },
  { name: "chart slide", content: { title: "Trend", hasChart: true, items: [1, 2, 3] } },
  { name: "media slide", content: { title: "In market", hasImage: true } },
];

describe("layout arbiter — combination coverage", () => {
  it("returns a feasible ranked candidate for every section × level × canvas × content shape", () => {
    const misses: string[] = [];
    for (const section of SECTION_FRAMEWORKS) {
      for (const level of levelsForSection(section.id)) {
        for (const canvas of CANVASES) {
          for (const shape of SHAPES) {
            const d = arbitrateLayout({
              sectionId: section.id,
              level,
              canvas,
              content: shape.content,
            });
            if (!d.best) {
              misses.push(`${section.id}/${level}/${canvas.width}x${canvas.height}/${shape.name}: no candidate`);
              continue;
            }
            if (!d.candidates.some((c) => c.feasible)) {
              misses.push(
                `${section.id}/${level}/${canvas.width}x${canvas.height}/${shape.name}: nothing feasible`,
              );
            }
            expect(d.consideredCount).toBeGreaterThan(0);
            expect(d.best.score).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(misses).toEqual([]);
  });

  it("is deterministic", () => {
    const brief = {
      sectionId: "SF-08",
      industryId: "R05",
      content: { title: "Proof", items: [1, 2, 3, 4], hasChart: true },
    };
    expect(bestLayoutVariant(brief)).toBe(bestLayoutVariant(brief));
    expect(arbitrateLayout(brief).candidates.map((c) => c.score)).toEqual(
      arbitrateLayout(brief).candidates.map((c) => c.score),
    );
  });

  it("prefers a chart-capable module when a chart is supplied", () => {
    const withChart = arbitrateLayout({
      sectionId: "SF-08",
      level: "kpi",
      content: { title: "Trend", hasChart: true, items: [1, 2, 3] },
    });
    expect(withChart.best?.fillFamily === "chart" || withChart.best?.fillFamily === "stats").toBe(true);
  });

  it("penalises a neighbour variant so consecutive slides do not repeat", () => {
    const base = arbitrateLayout({ sectionId: "SF-07", content: { title: "Detail", items: [1, 2, 3] } });
    const first = base.best!.variantId;
    const next = arbitrateLayout({
      sectionId: "SF-07",
      content: { title: "Detail", items: [1, 2, 3] },
      avoid: [first],
    });
    expect(next.best?.variantId).not.toBe(first);
  });

  it("recommends a split instead of shrinking type when content overruns the sheet", () => {
    const d = arbitrateLayout({
      sectionId: "SF-09",
      level: "body",
      content: {
        title: "Everything we found",
        body: "word ".repeat(320),
        items: Array.from({ length: 18 }, (_, i) => i),
      },
    });
    expect(d.canvas.splitRecommended).toBe(true);
    expect(d.canvas.suggestedSlides).toBeGreaterThan(1);
  });

  it("honours every brand scope without throwing", () => {
    for (const brand of BRAND_MODES) {
      const d = arbitrateLayout({
        sectionId: "SF-01",
        brandModeId: brand.id,
        content: { title: "Cover" },
      });
      expect(d.best).toBeTruthy();
    }
  });

  it("reports hard capacity violations for a named variant", () => {
    const fits = layoutFits("MV-OP-COVER", { content: { title: "x".repeat(400) } });
    expect(fits.fits).toBe(false);
    expect(fits.violations.length).toBeGreaterThan(0);
  });

  it("covers all five reading levels", () => {
    for (const level of TEMPLATE_LEVELS) {
      const d = arbitrateLayout({ level, content: { title: "Slide", items: [1, 2] } });
      expect(d.brief.level).toBe(level);
    }
  });
});
