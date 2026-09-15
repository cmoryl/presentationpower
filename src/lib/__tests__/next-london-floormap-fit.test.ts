// Frame rules: nothing drawn on a map sheet may cross its frame, whatever the
// operator types or how tight the sheet is set.
import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_DESIGN, type MapDesign } from "@/lib/next-london-floormap-design";
import { floorMapSheetSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import {
  fitInFrame,
  MIN_TYPE_PX,
  packRow,
  textWidth,
  truncateToWidth,
} from "@/lib/next-london-floormap-text";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const design = (over: Partial<MapDesign> = {}): MapDesign => ({ ...DEFAULT_MAP_DESIGN, ...over });
const LONG = "Queen Elizabeth II Centre lower ground exhibition and hospitality concourse";

/** Every <text> node with its x, anchor and estimated width. */
function texts(svg: string) {
  return [...svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => {
    const attr = m[1]!;
    const num = (name: string) => Number(new RegExp(`${name}="(-?[\\d.]+)"`).exec(attr)?.[1] ?? 0);
    return {
      x: num("x"),
      size: num("font-size"),
      tracking: num("letter-spacing"),
      anchor: /text-anchor="end"/.test(attr)
        ? "end"
        : /text-anchor="middle"/.test(attr)
          ? "middle"
          : "start",
      body: m[2]!,
      rotated: /transform="rotate/.test(attr),
    };
  });
}

describe("map text fitting", () => {
  it("shrinks before it trims, and never returns copy wider than the frame", () => {
    const wide = fitInFrame("Auditorium", 12, 400);
    expect(wide.text).toBe("Auditorium");
    expect(wide.size).toBe(12);

    const tight = fitInFrame("Auditorium", 12, 46);
    expect(tight.size).toBeLessThan(12);
    expect(tight.size).toBeGreaterThanOrEqual(MIN_TYPE_PX);
    expect(tight.width).toBeLessThanOrEqual(46);

    const hopeless = fitInFrame(LONG, 12, 30);
    expect(textWidth(hopeless.text, hopeless.size)).toBeLessThanOrEqual(30);
    expect(fitInFrame("Anything", 12, 0).text).toBe("");
    expect(truncateToWidth(LONG, 9, 60)).toMatch(/…$/);
  });

  it("packs chip rows the same way the sheet reserves them", () => {
    const { rows, chips } = packRow([50, 50, 50], 120, 0);
    expect(rows).toBe(2);
    expect(chips.map((c) => c.row)).toEqual([0, 0, 1]);
    expect(packRow([], 100).rows).toBe(0);
  });

  it("keeps operator copy inside the sheet margins on a tight sheet", () => {
    const svg = floorMapSvg("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: design({
        title: LONG,
        subtitle: LONG,
        eyebrow: LONG,
        legendTitle: LONG,
        footerNote: `${LONG} ${LONG}`,
        ppm: 8,
        margin: 20,
        logoScale: 46,
      }),
    });
    const size = floorMapSheetSize("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: design({ title: LONG, ppm: 8, margin: 20, logoScale: 46 }),
    });
    for (const t of texts(svg)) {
      if (t.rotated) continue;
      const w = textWidth(t.body, t.size, t.tracking);
      const left = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
      expect(left).toBeGreaterThanOrEqual(-0.6);
      expect(left + w).toBeLessThanOrEqual(size.w + 0.6);
      expect(t.size).toBeGreaterThanOrEqual(MIN_TYPE_PX - 0.01);
    }
  });

  it("reserves height for a key that wraps", () => {
    const opts = { panels: LONDON_PANELS, labels: true };
    const roomy = floorMapSheetSize("GF", { ...opts, design: design() });
    const narrow = floorMapSheetSize("GF", { ...opts, design: design({ ppm: 7, margin: 16 }) });
    const noKey = floorMapSheetSize("GF", {
      ...opts,
      design: design({ ppm: 7, margin: 16, legend: "none" }),
    });
    expect(narrow.h).toBeGreaterThan(noKey.h - 1);
    expect(roomy.h).toBeGreaterThan(0);
  });

  it("keeps named pin labels inside the sheet", () => {
    const svg = floorMapSvg("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: design({ labelMode: "named", pinScale: 1.6 }),
    });
    const size = floorMapSheetSize("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: design({ labelMode: "named", pinScale: 1.6 }),
    });
    for (const t of texts(svg)) {
      if (t.rotated) continue;
      const w = textWidth(t.body, t.size, t.tracking);
      const left = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
      expect(left + w).toBeLessThanOrEqual(size.w + 0.6);
    }
  });
});
