import { describe, expect, it } from "vitest";
import {
  extractHexes,
  extractRatio,
  inferLegibilityDemo,
  type LegibilityDemo,
} from "@/lib/legibility-demos";
import { BRAND_GUIDES } from "@/lib/brand-guides";

const DEMOS: LegibilityDemo[] = [
  "text-on-ground",
  "accent-fill-not-text",
  "white-on-blue-aa",
  "min-grey",
  "not-colour-only",
  "contrast-ratio",
  "print-100k",
];

describe("legibility note visual demos", () => {
  it("every colour-and-legibility note in every brand guide maps to a visual demo", () => {
    let count = 0;
    for (const guide of BRAND_GUIDES) {
      for (const note of guide.colorAccessibility?.notes ?? []) {
        count += 1;
        const demo = inferLegibilityDemo(note);
        expect(demo, `${guide.slug}: "${note.slice(0, 60)}…" has no visual demo`).not.toBeNull();
        expect(DEMOS).toContain(demo);
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it("canonical notes map to the right demos", () => {
    expect(
      inferLegibilityDemo("Body and heading text is Blue 800 #03002C on light, or white on Blue 500 #003FC7 and darker."),
    ).toBe("text-on-ground");
    expect(
      inferLegibilityDemo("Aqua #A1FBF9, Lavender #C2A3FF and every tertiary pop fail WCAG AA as text on white — use them as fills, rules, bars and icon shapes only."),
    ).toBe("accent-fill-not-text");
    expect(
      inferLegibilityDemo("White on Blue 500 #003FC7 clears AA at all sizes; white on Blue 800 #03002C clears AAA."),
    ).toBe("white-on-blue-aa");
    expect(
      inferLegibilityDemo("Dark Gray #666 is the lightest grey allowed for small text on white; never use it on a tinted surface."),
    ).toBe("min-grey");
    expect(
      inferLegibilityDemo("Colour is never the only signal — pair status colour with a label, icon or position."),
    ).toBe("not-colour-only");
    expect(
      inferLegibilityDemo("Connector lines need a 3:1 contrast against their background to read at print size."),
    ).toBe("contrast-ratio");
    expect(
      inferLegibilityDemo("Print body text is 100K black, never a four-colour build."),
    ).toBe("print-100k");
  });

  it("parses hex codes and ratios out of note text", () => {
    expect(extractHexes("Aqua #A1FBF9 and Lavender #C2A3FF are fills")).toEqual([
      "#A1FBF9",
      "#C2A3FF",
    ]);
    expect(extractHexes("Dark Gray #666 is the lightest grey")).toEqual(["#666666"]);
    expect(extractRatio("holds at least 4.5:1")).toBe("4.5:1");
    expect(extractRatio("need a 3:1 contrast")).toBe("3:1");
  });
});
