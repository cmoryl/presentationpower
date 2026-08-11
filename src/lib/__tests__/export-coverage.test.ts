/**
 * Post-export coverage audit: the numbers shown after export must be recounted
 * from the .pptx bytes, and must agree with the design-time claim (lines either
 * render on the slide or ride along in the speaker notes).
 */
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { auditExportCoverage } from "@/lib/export-coverage";
import { OVERFLOW_HEADER } from "@/lib/reinterpret-design";
import type { Deck } from "@/lib/deck-store";

function part(runs: string[]): string {
  return `<p:sld>${runs.map((r) => `<a:t>${r}</a:t>`).join("")}</p:sld>`;
}

async function pptx(slideRuns: string[], notesRuns: string[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file("ppt/slides/slide1.xml", part(slideRuns));
  zip.file("ppt/notesSlides/notesSlide1.xml", part(notesRuns));
  return await zip.generateAsync({ type: "blob" });
}

const ON_SLIDE = ["Localization spend fell 22 percent", "Nine markets launched in parallel"];
const OVERFLOW = ["Vendor consolidation removed four suppliers"];

function deck(): Deck {
  return {
    slides: [
      {
        id: "s1",
        variantId: "MV-STAT-TRIPTYCH",
        content: { title: ON_SLIDE[0], items: [{ body: ON_SLIDE[1] }] },
        notes: `Key message.\n\n${OVERFLOW_HEADER}\n• ${OVERFLOW[0]}`,
      },
    ],
  } as unknown as Deck;
}

describe("auditExportCoverage", () => {
  it("counts on-slide lines and notes overflow from the exported file", async () => {
    const blob = await pptx(ON_SLIDE, [OVERFLOW[0]]);
    const report = await auditExportCoverage(deck(), blob);
    expect(report.total).toBe(3);
    expect(report.covered).toBe(2);
    expect(report.inNotes).toBe(1);
    expect(report.missing).toBe(0);
    expect(report.matches).toBe(true);
  });

  it("flags lines that the exported file lost entirely", async () => {
    const blob = await pptx([ON_SLIDE[0]], []);
    const report = await auditExportCoverage(deck(), blob);
    expect(report.covered).toBe(1);
    expect(report.missing).toBe(2);
    expect(report.matches).toBe(false);
  });
});
