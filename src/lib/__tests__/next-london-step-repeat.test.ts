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
    const row0 = plan.tiles.filter((t) => t.row === 0).map((t) => t.x)[0]!;
    const row1 = plan.tiles.filter((t) => t.row === 1).map((t) => t.x)[0]!;
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

  it("reports every dimension in millimetres and inches", () => {
    expect(dimText(254)).toBe("254 mm (10.00 in)");
    expect(sizeText(3000, 2400)).toBe("3000 × 2400 mm (118.11 × 94.49 in)");
  });
});
