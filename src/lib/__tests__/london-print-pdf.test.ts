import { describe, expect, it } from "vitest";

import { auditPrintPdf } from "@/lib/london-signage-qa";
import { buildLondonPanelPrintPdf, LONDON_MARKS_MARGIN_MM } from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const MM_TO_PT = 72 / 25.4;
const text = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");
const box = (pdf: string, name: string) =>
  new RegExp(`/${name}\\s*\\[([^\\]]+)\\]`).exec(pdf)?.[1]!.trim().split(/\s+/).map(Number) ?? null;

const panel = LONDON_PANELS.find((p) => !p.name.toLowerCase().includes("booth"))!;

describe("print-ready PDF per sign", () => {
  const pdf = text(buildLondonPanelPrintPdf(panel));

  it("is a valid single-page PDF", () => {
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("grows the page by the marks margin on every edge", () => {
    const media = box(pdf, "MediaBox")!;
    const m = LONDON_MARKS_MARGIN_MM * MM_TO_PT;
    expect(media[2]! - media[0]!).toBeCloseTo(panel.bleedW * MM_TO_PT + m * 2, 1);
    expect(media[3]! - media[1]!).toBeCloseTo(panel.bleedH * MM_TO_PT + m * 2, 1);
  });

  it("keeps the artwork at bleed size and the trim box at the cut line", () => {
    const m = LONDON_MARKS_MARGIN_MM * MM_TO_PT;
    const bleed = box(pdf, "BleedBox")!;
    expect(bleed[0]!).toBeCloseTo(m, 1);
    expect(bleed[2]! - bleed[0]!).toBeCloseTo(panel.bleedW * MM_TO_PT, 1);
    const trim = box(pdf, "TrimBox")!;
    expect(trim[0]!).toBeCloseTo(m + ((panel.bleedW - panel.trimW) / 2) * MM_TO_PT, 1);
    expect(trim[2]! - trim[0]!).toBeCloseTo(panel.trimW * MM_TO_PT, 1);
  });

  it("draws marks and stays font-free", () => {
    expect(pdf).toMatch(/\/TPPrintMarks\s*true/);
    expect(pdf).toMatch(/ S\n/);
    expect(/\/Subtype\s*\/(TrueType|Type1)/.test(pdf)).toBe(false);
    expect(/ Tj/.test(pdf)).toBe(false);
  });

  it("passes the print QA gate", () => {
    const report = auditPrintPdf(panel, buildLondonPanelPrintPdf(panel), LONDON_MARKS_MARGIN_MM);
    const failed = report.checks.filter((c) => c.status === "fail");
    expect(failed.map((c) => c.id)).toEqual([]);
  });

  it("leaves the design master untouched (no margin)", () => {
    const media = box(pdf, "MediaBox")!;
    expect(media[0]).toBe(0);
    expect(media[2]! - media[0]!).toBeGreaterThan(panel.bleedW * MM_TO_PT);
  });
});
