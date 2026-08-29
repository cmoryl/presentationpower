import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * MV-DASH-DONUT-TRIO regression guard.
 *
 * The exported trio must (a) sit on ONE row of three and (b) draw the same
 * hairline-track + thin accent arc donut as `FreeformDonut` on screen — not the
 * pack-driven thick ring band, which read as a solid blue puck in PowerPoint.
 */
const root = path.resolve(__dirname, "../..");
const exportSrc = readFileSync(path.join(root, "lib/pptx-export.ts"), "utf8");
const dashSrc = readFileSync(path.join(root, "components/slide/modules/dashboard.tsx"), "utf8");

function donutTrioExport(): string {
  const start = exportSrc.indexOf("function renderDashDonutTrio(");
  expect(start).toBeGreaterThan(-1);
  return exportSrc.slice(start, start + 2200);
}

describe("donut trio — build ↔ PowerPoint parity", () => {
  it("exports through the freeform donut, not the pack ring gauge", () => {
    const body = donutTrioExport();
    expect(body).toContain("drawFreeformDonut(s, {");
    expect(body).not.toContain("drawRingGauge(");
  });

  it("keeps the three gauges on a single row", () => {
    const body = donutTrioExport();
    expect(body).toMatch(/const colW = \(SLIDE_W - 1\.2\) \/ n;/);
    expect(body).toMatch(/arr\(c\.items\)\.slice\(0, 3\)/);
  });

  it("draws a 1pt hairline track and a thin accent arc", () => {
    const start = exportSrc.indexOf("function drawFreeformDonut(");
    expect(start).toBeGreaterThan(-1);
    const donut = exportSrc.slice(start, exportSrc.indexOf("function renderDashDonutTrio("));
    expect(donut).toContain("const strokePx = 6");
    expect(donut).toMatch(/line: \{ color: o\.track, width: 1 \}/);
    expect(donut).toContain("arcThicknessRatio: thickness");
  });

  it("never wraps the on-screen trio to a look's metric column count", () => {
    const start = dashSrc.indexOf('case "MV-DASH-DONUT-TRIO"');
    const body = dashSrc.slice(start, start + 1800);
    expect(body).toContain("repeat(${Math.max(1, items.length || 1)}, 1fr)");
    expect(body).not.toContain("dash.metricColumns");
  });
});
