import { describe, expect, it } from "vitest";

import { ASPECT_TOLERANCE, checkExportAspect, formatAspectWarning } from "../export-aspect-check";

const LETTER = { widthIn: 8.5, heightIn: 11 };

function check(
  sizes: Array<{ width: number; height: number }>,
  fit: "stretch" | "letterbox" = "stretch",
) {
  return checkExportAspect([], { ...LETTER, fit, sizes });
}

describe("checkExportAspect", () => {
  it("passes pages rendered at the trim ratio, at any scale", () => {
    const report = check([
      { width: 850, height: 1100 },
      { width: 425, height: 550 },
      { width: 1100, height: 1423.5 },
    ]);
    expect(report.severity).toBe("ok");
    expect(report.offenders).toHaveLength(0);
    expect(formatAspectWarning(report)).toBeNull();
  });

  it("tolerates sub-pixel rounding drift", () => {
    const report = check([{ width: 850, height: 1101 }]);
    expect(report.worstDeltaPct).toBeLessThan(ASPECT_TOLERANCE.ok);
    expect(report.severity).toBe("ok");
  });

  it("warns on small mismatches and errors on visible ones", () => {
    expect(check([{ width: 850, height: 1112 }]).severity).toBe("warn");
    expect(check([{ width: 850, height: 1250 }]).severity).toBe("error");
  });

  it("reports the non-uniform scale a stretched PDF placement would apply", () => {
    const page = check([{ width: 850, height: 1250 }], "stretch").pages[0]!;
    expect(page.direction).toBe("taller");
    expect(page.distortion.scaleY).toBeLessThan(1); // vertically stretched
    expect(page.message).toMatch(/distorting type and logos/);
  });

  it("reports letterbox bands instead of distortion for slide fit", () => {
    const page = check([{ width: 850, height: 1250 }], "letterbox").pages[0]!;
    expect(page.letterboxPct.x).toBeGreaterThan(10);
    expect(page.letterboxPct.y).toBeCloseTo(0, 5);
    expect(page.message).toMatch(/letterboxed/);
  });

  it("flags unmeasurable pages as errors", () => {
    const report = check([{ width: 0, height: 0 }]);
    expect(report.severity).toBe("error");
    expect(report.pages[0]!.message).toMatch(/no measurable size/);
  });

  it("suggests a better trim only when every page agrees on one ratio", () => {
    const uniform = check([
      { width: 826.77, height: 1169.29 },
      { width: 826.77, height: 1169.29 },
    ]);
    expect(uniform.suggestedPageSize).toBe("A4");

    const mixed = check([
      { width: 850, height: 1100 },
      { width: 850, height: 1400 },
    ]);
    expect(mixed.suggestedPageSize).toBeNull();
  });

  it("summarises the worst offender for the UI", () => {
    const report = check([
      { width: 850, height: 1100 },
      { width: 850, height: 1250 },
    ]);
    const warning = formatAspectWarning(report);
    expect(warning).toContain("1 of 2 pages");
    expect(warning).toContain("Page 2");
  });
});
