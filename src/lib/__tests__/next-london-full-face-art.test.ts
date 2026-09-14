// Uploaded artwork that covers the whole sheet already carries its own lockup
// and wording — the kit must not typeset a second one over it.

import { describe, expect, it } from "vitest";

import { londonBrandingPlan } from "@/lib/next-london-branding";
import type { LondonPlacedArt } from "@/lib/next-london-placed-art";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const panel = LONDON_PANELS.find((p) => p.id === "ldn-26")!;

function art(size: number): LondonPlacedArt {
  return {
    name: "britten-p04.svg",
    format: "svg",
    paths: [{ d: "M0 0 H10 V10 H0 Z", fill: "#FFFFFF", m: [1, 0, 0, 1, 0, 0] }],
    w: 100,
    h: 100,
    on: true,
    size,
    dx: 0,
    dy: 0,
    rotate: 0,
    opacity: 1,
    onTop: true,
  };
}

describe("full-face uploaded artwork", () => {
  it("suppresses the generated lockup and headline", () => {
    const plan = londonBrandingPlan(panel, undefined, art(1));
    expect(plan.lockupOn).toBe(false);
    expect(plan.copy).toBeNull();
  });

  it("keeps the house layers for a placed element", () => {
    const plan = londonBrandingPlan(panel, undefined, art(0.3));
    expect(plan.lockupOn).toBe(true);
    expect(plan.copy).toBeTruthy();
  });
});
