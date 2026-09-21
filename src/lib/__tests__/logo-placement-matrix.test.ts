import { describe, expect, it } from "vitest";

import {
  clearspaceFor,
  groundIsDark,
  LOGO_MIN_WIDTH_PX,
  pxToMm,
  selectLogoVariant,
  validateLogoPlacement,
  type LogoPlacementInput,
} from "@/lib/logo-placement-matrix";

const base = (over: Partial<LogoPlacementInput> = {}): LogoPlacementInput => ({
  id: "l1",
  label: "Slide 01 · lockup",
  medium: "slide",
  surface: { w: 1600, h: 900 },
  box: { x: 300, y: 300, w: 240, h: 40 },
  ground: { kind: "solid-token", hex: "#ffffff" },
  orientation: "horizontal",
  tone: "black",
  ...over,
});

describe("logo placement matrix", () => {
  it("passes a well-placed lockup", () => {
    expect(validateLogoPlacement(base())).toEqual([]);
  });

  it("measures clear space as 1.5x the T height", () => {
    expect(clearspaceFor({ x: 0, y: 0, w: 200, h: 40 }, "horizontal")).toBeCloseTo(60, 6);
    expect(clearspaceFor({ x: 0, y: 0, w: 80, h: 80 }, "stacked")).toBeCloseTo(60, 6);
  });

  it("flags a lockup crowded by the surface edge", () => {
    const findings = validateLogoPlacement(base({ box: { x: 8, y: 300, w: 240, h: 40 } }));
    expect(findings.some((f) => f.check === "logo-clearspace" && f.severity === "fail")).toBe(true);
  });

  it("flags a neighbour inside the safe zone", () => {
    const findings = validateLogoPlacement(
      base({ neighbours: [{ x: 560, y: 300, w: 200, h: 40, label: "Headline" }] }),
    );
    expect(findings.some((f) => f.check === "logo-clearspace")).toBe(true);
  });

  it("flags a lockup under the recorded minimum size", () => {
    const findings = validateLogoPlacement(base({ box: { x: 300, y: 300, w: 90, h: 16 } }));
    const min = findings.find((f) => f.check === "logo-min-size");
    expect(min?.severity).toBe("fail");
    expect(min?.detail).toContain(`${LOGO_MIN_WIDTH_PX.slide.horizontal}px`);
  });

  it("reports print minimums in millimetres", () => {
    const findings = validateLogoPlacement(
      base({ medium: "print", box: { x: 200, y: 200, w: 60, h: 12 } }),
    );
    expect(findings.find((f) => f.check === "logo-min-size")?.detail).toContain("mm");
    expect(pxToMm(96)).toBeCloseTo(25.4, 6);
  });

  it("selects the white lockup on dark tokens and photography", () => {
    expect(groundIsDark({ kind: "solid-token", hex: "#03002C" })).toBe(true);
    expect(
      selectLogoVariant({
        medium: "slide",
        box: { w: 240, h: 40 },
        ground: { kind: "solid-token", hex: "#03002C" },
      }).tone,
    ).toBe("white");
    expect(
      selectLogoVariant({ medium: "social", box: { w: 240, h: 40 }, ground: { kind: "photo" } })
        .tone,
    ).toBe("white");
  });

  it("selects the black lockup on light tokens", () => {
    expect(
      selectLogoVariant({
        medium: "print",
        box: { w: 240, h: 40 },
        ground: { kind: "solid-token", hex: "#EEF1F7" },
      }).tone,
    ).toBe("black");
  });

  it("drops to a smaller lockup when the box is too narrow", () => {
    const choice = selectLogoVariant({
      medium: "slide",
      box: { w: 110, h: 40 },
      ground: { kind: "solid-token", hex: "#ffffff" },
      prefer: "horizontal",
    });
    expect(choice.orientation).toBe("stacked");
    expect(choice.downgraded).toBe(true);
    const tiny = selectLogoVariant({
      medium: "slide",
      box: { w: 44, h: 44 },
      ground: { kind: "solid-token", hex: "#ffffff" },
      prefer: "horizontal",
    });
    expect(tiny.orientation).toBe("mark-only");
  });

  it("flags the wrong tone for the ground as a failure", () => {
    const findings = validateLogoPlacement(
      base({ ground: { kind: "solid-token", hex: "#03002C" }, tone: "black" }),
    );
    expect(findings.some((f) => f.check === "logo-variant" && f.severity === "fail")).toBe(true);
  });

  it("asks for a scrim when a white lockup sits straight on artwork", () => {
    const findings = validateLogoPlacement(
      base({ ground: { kind: "photo" }, tone: "white" }),
    );
    expect(findings.some((f) => f.id.endsWith("-scrim"))).toBe(true);
    const scrimmed = validateLogoPlacement(
      base({ ground: { kind: "photo", scrim: true }, tone: "white" }),
    );
    expect(scrimmed.some((f) => f.id.endsWith("-scrim"))).toBe(false);
  });
});
