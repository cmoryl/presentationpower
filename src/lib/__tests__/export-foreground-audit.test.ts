/**
 * Contrast + overlap assertions and the surface/foreground pairing table.
 *
 * The contrast cases are the exact pairs measured in the exported light-mode
 * module library; the overlap cases are the two exact layout faults (split
 * styled line, pre-wrapped continuation shape).
 */

import { describe, expect, it } from "vitest";
import {
  BRAND_NAVY,
  canonicalizeInk,
  contrastRatio,
  foregroundOn,
  resolveForeground,
} from "@/lib/export-foreground";
import {
  auditContrast,
  auditTextOverlap,
  assertContrast,
  assertNoTextOverlap,
  decorName,
  type AuditFill,
  type AuditText,
} from "@/lib/export-audit";
import { mergeTextRuns } from "@/lib/export-text-merge";
import type { TextRun } from "@/lib/export-text-layer";

const MEASURED: Array<[panel: string, text: string, ratio: number]> = [
  ["03002C", "03002C", 1],
  ["003FC7", "003FC7", 1],
  ["003FC7", "03002C", 2.4],
  ["003EC9", "03002C", 2.4],
  ["003FC7", "0A0F1C", 2.3],
  ["03002C", "003FC7", 2.4],
  ["0A0F1C", "03002C", 1.1],
];

const panel = (hex: string): AuditFill => ({ x: 1, y: 1, w: 4, h: 2, hex });
const label = (color: string): AuditText => ({
  x: 1.2,
  y: 1.4,
  w: 3,
  h: 0.4,
  text: "Body copy",
  color,
  name: "Label",
});

describe("surface / foreground pairing", () => {
  it("reproduces every measured failing pair and rejects it", () => {
    for (const [fill, text, ratio] of MEASURED) {
      expect(contrastRatio(text, fill)).toBeLessThan(4.5);
      // The canonicalised non-brand dark keeps the same failure.
      expect(Math.abs(contrastRatio(text, fill) - ratio)).toBeLessThan(1.4);
      const fails = auditContrast([label(text)], [panel(fill)]);
      expect(fails).toHaveLength(1);
      expect(() => assertContrast([label(text)], [panel(fill)])).toThrow(/contrast/i);
    }
  });

  it("pairs every dark brand surface with white and light surfaces with navy", () => {
    for (const dark of ["03002C", "003FC7", "003EC9", "3900E6", "141435"]) {
      expect(foregroundOn(dark)).toBe("FFFFFF");
      expect(contrastRatio(foregroundOn(dark), dark)).toBeGreaterThanOrEqual(4.5);
    }
    for (const light of ["FFFFFF", "F2F2F2", "E0E8F5", "FFEB66"]) {
      expect(foregroundOn(light)).toBe(BRAND_NAVY);
      expect(contrastRatio(foregroundOn(light), light)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("resolves every failing pair to a compliant foreground", () => {
    for (const [fill, text] of MEASURED) {
      const resolved = resolveForeground(text, fill);
      expect(contrastRatio(resolved, fill)).toBeGreaterThanOrEqual(4.5);
    }
    // A compliant colour is left alone.
    expect(resolveForeground("FFFFFF", "003FC7")).toBe("FFFFFF");
  });

  it("canonicalises the non-brand dark #0A0F1C to brand navy", () => {
    expect(canonicalizeInk("#0a0f1c")).toBe(BRAND_NAVY);
    expect(canonicalizeInk("003FC7")).toBe("003FC7");
  });

  it("ignores translucent fills and fills that do not contain the text", () => {
    expect(auditContrast([label("03002C")], [{ ...panel("03002C"), transparency: 60 }])).toEqual([]);
    expect(auditContrast([label("03002C")], [{ ...panel("03002C"), x: 8 }])).toEqual([]);
  });
});

describe("text overlap assertion", () => {
  const box = (name: string, x: number, y: number, w = 3, h = 1.21): AuditText => ({
    x,
    y,
    w,
    h,
    text: name,
    color: BRAND_NAVY,
    name,
  });

  it("flags the split styled line and the pre-wrapped continuation", () => {
    // Cover: two shapes at y=4.11in, both h=1.21in, overlapping after a metric shift.
    expect(auditTextOverlap([box("The Module", 1, 4.11), box("Library", 2.2, 4.11)])).toHaveLength(1);
    // Slide 70: tail word inside the headline box's vertical span.
    const headline = box("headline", 1, 2.71, 8, 2.76);
    const tail = box("markets.", 1, 4.33, 1.4, 0.6);
    expect(auditTextOverlap([headline, tail])).toHaveLength(1);
    expect(() => assertNoTextOverlap([headline, tail])).toThrow(/overlapping/i);
  });

  it("exempts explicitly decorative layers", () => {
    const numeral: AuditText = { ...box("07", 1, 2.5, 4, 4), name: decorName("Display numeral") };
    expect(auditTextOverlap([numeral, box("headline", 1.2, 3, 3, 1)])).toEqual([]);
  });

  it("allows small incidental overlaps", () => {
    expect(auditTextOverlap([box("a", 0, 0, 2, 1), box("b", 1.8, 0, 2, 1)])).toEqual([]);
  });
});

// ── merge ─────────────────────────────────────────────────────────────────────

function run(over: Partial<TextRun>): TextRun {
  return {
    x: 0,
    y: 0,
    w: 200,
    h: 100,
    text: "text",
    fontSizePx: 88,
    fontFamily: "Geist",
    bold: false,
    italic: false,
    underline: false,
    color: "03002C",
    transparency: 0,
    align: "left",
    lineHeightPx: 96,
    letterSpacingPx: 0,
    singleLine: true,
    valign: "top",
    paragraph: {
      textIndentPx: 0,
      padLeftPx: 0,
      padRightPx: 0,
      spaceBeforePx: 0,
      spaceAfterPx: 0,
      whiteSpace: "normal",
      overflowWrap: "normal",
      hyphens: "manual",
      listMarker: null,
    },
    ...over,
  } as TextRun;
}

describe("run merging delegates layout to PowerPoint", () => {
  it("fuses two styles on one line into a single multi-run block", () => {
    const blocks = mergeTextRuns([
      run({ text: "The Module", x: 100, y: 592, w: 520, bold: true }),
      run({ text: "Library", x: 630, y: 592, w: 340, italic: true, color: "003FC7" }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.runs.map((r) => r.text)).toEqual(["The Module", "Library"]);
    expect(blocks[0]!.w).toBeGreaterThan(800);
  });

  it("fuses a pre-wrapped continuation fragment into one wrapping box", () => {
    const blocks = mergeTextRuns([
      run({ text: "Enter regulated", x: 100, y: 390, w: 900, h: 200, singleLine: false }),
      run({ text: "markets.", x: 100, y: 624, w: 240, h: 90 }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.wrap).toBe(true);
    expect(blocks[0]!.runs).toHaveLength(1);
    expect(blocks[0]!.runs[0]!.text).toBe("Enter regulated markets.");
  });

  it("keeps unrelated runs apart", () => {
    const blocks = mergeTextRuns([
      run({ text: "Kicker", x: 100, y: 100, w: 200, fontSizePx: 24, h: 30 }),
      run({ text: "Headline", x: 100, y: 400, w: 800 }),
    ]);
    expect(blocks).toHaveLength(2);
  });
});
