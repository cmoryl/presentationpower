import { describe, expect, it } from "vitest";

import { LONDON_PANELS, LONDON_STYLES } from "@/lib/next-london-signage";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import {
  isStepRepeatPanel,
  stepRepeatPanelDefault,
  stepRepeatPlan,
} from "@/lib/next-london-step-repeat";

const wall = LONDON_PANELS.find(
  (p) => /COLOUR LOCKUPS/i.test(p.name) && !/RETURN/i.test(p.name),
)!;
const returns = LONDON_PANELS.filter((p) => /COLOUR LOCKUPS RETURN/i.test(p.name));

describe("full-colour division lockup step & repeat wall", () => {
  it("exists in the kit as a photo wall on a near-white ground", () => {
    expect(wall).toBeDefined();
    expect(isStepRepeatPanel(wall)).toBe(true);
    expect(wall.trimW).toBe(4500);
    expect(wall.trimH).toBe(6500);
    expect(wall.bleedEdge).toBe(100);
    expect(LONDON_STYLES["13-repeat-white"]).toBeDefined();
  });

  it("carries a 1m return each side on the same recipe", () => {
    expect(returns.length).toBe(2);
    const side = returns[0]!;
    expect(side.name).toMatch(/1000x6500mm/);
    expect(side.trimW).toBe(1000);
    expect(side.trimH).toBe(6500);
    expect(side.bleedEdge).toBe(100);
    expect(isStepRepeatPanel(side)).toBe(true);
    expect(stepRepeatPanelDefault(side.id)).toEqual(stepRepeatPanelDefault(wall.id));
  });


  it("ships with the full-colour stacked division recipe", () => {
    const config = stepRepeatPanelDefault(wall.id);
    expect(config.logoSet).toBe("divisions");
    expect(config.colourway).toBe("color");
    expect(config.orientation).toBe("stacked");
    expect(config.kind).toBe("logo");
  });

  it("rotates every division mark through a half-drop grid", () => {
    const plan = stepRepeatPlan(wall, stepRepeatPanelDefault(wall.id));
    expect(plan.arts.length).toBeGreaterThan(8);
    const used = new Set(plan.tiles.flatMap((t) => (t.kind === "logo" ? [t.artIndex] : [])));
    expect(used.size).toBe(plan.arts.length);
    expect(plan.tiles.every((t) => t.kind === "logo")).toBe(true);
  });

  it("writes every mark as a live vector object into the .svg and .ai masters", () => {
    const config = stepRepeatPanelDefault(wall.id);
    const plan = stepRepeatPlan(wall, config);
    const svg = buildLondonPanelSvg(wall, { stepRepeat: config });
    expect(svg).toContain('id="step-repeat"');
    expect((svg.match(/data-tile="/g) ?? []).length).toBe(plan.tiles.length);

    const bytes = buildLondonPanelAi(wall, { stepRepeat: config });
    expect(bytes.byteLength).toBeGreaterThan(20_000);
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text.startsWith("%PDF")).toBe(true);
  });
});
