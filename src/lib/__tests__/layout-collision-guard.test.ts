/**
 * Layout Collision Guard
 * ----------------------
 * Static-analysis test that flags likely overlap between the primary slide
 * modules — TitleBlock, SegmentedBar, graphs, and section bodies — in both
 * light and dark previews. jsdom can't actually lay out 1920×1080 slides,
 * so we enforce the spacing contracts every variant depends on:
 *
 *   1. TitleBlock ships with a mandatory bottom breathing room class.
 *   2. SegmentedBar reserves top + bottom margins large enough for its
 *      above/below callouts to never punch into the hero or footer.
 *   3. Every variant `case` inside VariantRenderer that renders body
 *      content after <SlideTitle/> gives the first sibling a top-margin
 *      of at least mt-10 (≈40px at slide scale).
 *   4. Chart & data-viz variants use at least mt-12 to keep their axes
 *      clear of the title in both modes.
 *
 * These constants are shared across light + dark modes (the same JSX
 * paints both), so verifying the source once guards both previews.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(__dirname, "../../..");
const VARIANT_RENDERER = readFileSync(
  resolve(REPO, "src/components/slide/VariantRenderer.tsx"),
  "utf8",
);
const PRIMITIVES = readFileSync(
  resolve(REPO, "src/components/slide/primitives.tsx"),
  "utf8",
);

// Minimum Tailwind mt-* / mb-* number required as breathing room.
const MIN_TITLE_BOTTOM = 10;   // mb-10 ≈ 40px
const MIN_BODY_TOP     = 10;   // mt-10 ≈ 40px
const MIN_CHART_TOP    = 12;   // mt-12 ≈ 48px
const MIN_SEG_TOP_PX   = 140;  // marginTop reserve for above-labels
const MIN_SEG_BOT_PX   = 120;  // marginBottom reserve for below-labels

// Chart / data-viz families whose first body sibling needs extra clearance.
const CHART_VARIANT_HINTS = [
  "CHART", "BAR", "LINE", "AREA", "DONUT", "STAT", "DASH",
  "GRAPH", "TREND", "MATURITY", "GAUGE", "SPARK", "METRIC",
];

function readTailwindNumber(cls: string, prefix: "mt" | "mb"): number | null {
  const m = cls.match(new RegExp(`\\b${prefix}-(\\d+)\\b`));
  return m ? Number(m[1]) : null;
}

describe("TitleBlock reserves bottom breathing room", () => {
  it("carries a mb-N class ≥ mb-10 in its rendered wrapper", () => {
    // TitleBlock is the shared header; every variant funnels through it.
    const titleReturn = PRIMITIVES.split(/export function TitleBlock\b/)[1] ?? "";
    const mb = readTailwindNumber(titleReturn.slice(0, 800), "mb");
    expect(mb, "TitleBlock wrapper must include a mb-N class").not.toBeNull();
    expect(mb!).toBeGreaterThanOrEqual(MIN_TITLE_BOTTOM);
  });
});

describe("SegmentedBar reserves callout clearance", () => {
  it("uses marginTop ≥ 140 and marginBottom ≥ 120", () => {
    const seg = VARIANT_RENDERER.split(/function SegmentedBar\b/)[1] ?? "";
    const body = seg.slice(0, 1200);
    const top = body.match(/marginTop:\s*(\d+)/);
    const bot = body.match(/marginBottom:\s*(\d+)/);
    expect(top, "SegmentedBar must set an explicit marginTop").not.toBeNull();
    expect(bot, "SegmentedBar must set an explicit marginBottom").not.toBeNull();
    expect(Number(top![1])).toBeGreaterThanOrEqual(MIN_SEG_TOP_PX);
    expect(Number(bot![1])).toBeGreaterThanOrEqual(MIN_SEG_BOT_PX);
  });
});

describe("Variant bodies keep clearance below the hero title", () => {
  // Split file into case-blocks and inspect the first sibling after
  // <SlideTitle …/> for a mt-N Tailwind class.
  const caseBlocks: { id: string; body: string }[] = [];
  const caseRe = /case\s+"(MV-[A-Z0-9_-]+)":\s*{([\s\S]*?)^\s*}\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(VARIANT_RENDERER)) !== null) {
    caseBlocks.push({ id: m[1], body: m[2] });
  }

  it("finds a meaningful set of variant cases to audit", () => {
    // Sanity check the parser — if the file shape changes drastically we
    // want a loud signal, not a silent pass.
    expect(caseBlocks.length).toBeGreaterThan(40);
  });

  const violations: string[] = [];
  const chartViolations: string[] = [];

  for (const { id, body } of caseBlocks) {
    const afterTitle = body.split(/<SlideTitle\b/)[1];
    if (!afterTitle) continue; // variant uses a bespoke header — skip.

    // Grab the first JSX sibling opening tag (the one right after
    // </SlideTitle …/>). It's the element that could collide with the header.
    const sibling = afterTitle.match(/\/>\s*([\s\S]{0,600})/);
    if (!sibling) continue;
    const snippet = sibling[1];

    const firstOpen = snippet.match(/<(?:div|section|main|GlassTile|MetaRow|SegmentedBar|Aurora[A-Za-z]+)\b[^>]*>/);
    if (!firstOpen) continue;

    const tag = firstOpen[0];
    const isSegmentedBar = /<SegmentedBar\b/.test(tag);
    if (isSegmentedBar) continue; // has its own inline margins, tested above.

    const mt = readTailwindNumber(tag, "mt");
    const isChart = CHART_VARIANT_HINTS.some((h) => id.includes(h));
    const min = isChart ? MIN_CHART_TOP : MIN_BODY_TOP;

    if (mt === null || mt < min) {
      const line = `${id}: first sibling after <SlideTitle/> = "${tag.slice(0, 90)}…" (mt=${mt ?? "none"}, min=${min})`;
      (isChart ? chartViolations : violations).push(line);
    }
  }

  it("keeps ≥ mt-10 on the first body sibling of every section variant", () => {
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps ≥ mt-12 on the first body sibling of every chart / data-viz variant", () => {
    expect(chartViolations, chartViolations.join("\n")).toEqual([]);
  });
});
