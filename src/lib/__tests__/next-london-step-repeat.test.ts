import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import { buildLondonPanelSvg } from "@/lib/next-london-revise";
import {
  DEFAULT_STEP_REPEAT,
  dimText,
  isStepRepeatPanel,
  sizeText,
  stepRepeatPlan,
  stepRepeatWarnings,
} from "@/lib/next-london-step-repeat";

const walls = LONDON_PANELS.filter(isStepRepeatPanel);
const wall = walls[0]!;

describe("step & repeat wall", () => {
  it("identifies the photo walls in the kit", () => {
    expect(walls.length).toBeGreaterThanOrEqual(3);
    expect(walls.every((p) => /STEP & REPEAT/i.test(p.name))).toBe(true);
  });

  it("tiles the full bleed box with a staggered grid", () => {
    const plan = stepRepeatPlan(wall, DEFAULT_STEP_REPEAT);
    expect(plan.tiles.length).toBeGreaterThan(20);
    // Overscan: the field starts left of and above the artboard so it bleeds.
    expect(Math.min(...plan.tiles.map((t) => t.x))).toBeLessThan(0);
    expect(Math.min(...plan.tiles.map((t) => t.y))).toBeLessThan(0);
    // Odd rows are dropped by half a pitch.
    const centre = (row: number) => {
      const t = plan.tiles.find((tile) => tile.row === row)!;
      return t.x + t.w / 2;
    };
    const row0 = centre(0);
    const row1 = centre(1);
    expect(Math.abs(row1 - row0 - plan.pitchX * DEFAULT_STEP_REPEAT.drop)).toBeLessThan(1);
  });

  it("keeps every mark a live vector object in the svg master, with no hero lockup", () => {
    const svg = buildLondonPanelSvg(wall);
    const plan = stepRepeatPlan(wall, DEFAULT_STEP_REPEAT);
    expect(svg).toContain('id="step-repeat"');
    expect((svg.match(/data-tile="/g) ?? []).length).toBe(plan.tiles.length);
    expect(svg).not.toContain('id="hero-lockup"');
  });

  it("flags recipes that break press-wall practice", () => {
    const tight = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      tileWidthMm: 80,
      gapX: 0.1,
      gapY: 0.1,
      drop: 0,
    });
    expect(stepRepeatWarnings(wall, tight).length).toBeGreaterThan(1);
    expect(stepRepeatWarnings(wall, stepRepeatPlan(wall, DEFAULT_STEP_REPEAT))).toEqual([]);
  });

  it("spreads a mixed recipe evenly instead of banding rows 2:1", () => {
    const config = {
      ...DEFAULT_STEP_REPEAT,
      kind: "logo-qr" as const,
      qrData: "https://example.com",
      mix: "checker" as const,
    };
    const plan = stepRepeatPlan(wall, config);
    const qr = plan.tiles.filter((t) => t.kind === "qr").length;
    const logo = plan.tiles.filter((t) => t.kind === "logo").length;
    // A checkerboard is close to half and half, never a 1-in-3 stripe.
    expect(qr / (qr + logo)).toBeGreaterThan(0.4);
    // Neighbours in a row always differ.
    const row0 = plan.tiles.filter((t) => t.row === 0).map((t) => t.kind);
    expect(row0.slice(0, 4)).toEqual(["logo", "qr", "logo", "qr"]);

    const rows = stepRepeatPlan(wall, { ...config, mix: "rows" });
    expect(new Set(rows.tiles.filter((t) => t.row === 1).map((t) => t.kind))).toEqual(
      new Set(["qr"]),
    );
  });

  it("rotates every division lockup through the grid on an all-divisions wall", () => {
    const plan = stepRepeatPlan(wall, {
      ...DEFAULT_STEP_REPEAT,
      kind: "logo" as const,
      logoSet: "divisions" as const,
    });
    expect(plan.arts.length).toBeGreaterThan(5);
    const used = new Set(
      plan.tiles.flatMap((t) => (t.kind === "logo" ? [t.artIndex] : [])),
    );
    expect(used.size).toBe(plan.arts.length);
    // No mark repeats immediately beside itself.
    const row = plan.tiles.filter((t) => t.row === 0);
    for (let i = 1; i < row.length; i += 1) {
      const a = row[i - 1]!;
      const b = row[i]!;
      if (a.kind === "logo" && b.kind === "logo") expect(a.artIndex).not.toBe(b.artIndex);
    }
  });

  it("reports every dimension in millimetres and inches", () => {
    expect(dimText(254)).toBe("254 mm (10.00 in)");
    expect(sizeText(3000, 2400)).toBe("3000 × 2400 mm (118.11 × 94.49 in)");
  });
});
