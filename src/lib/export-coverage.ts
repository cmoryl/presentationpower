// Post-export coverage audit.
//
// The reinterpretation pass reports, per slide, how many source lines the
// designed layout could hold ("X of Y source lines on the slide") and parks
// the remainder in speaker notes. This module verifies that claim against the
// bytes we actually hand the user: it unzips the generated .pptx, reads the
// text runs out of each slide part and its notes part, and recounts coverage
// with the SAME matching logic the designer used (`isCovered` / `norm`), so
// the numbers are directly comparable instead of independently invented.
//
// A line is:
//   • covered   — found in the slide's own text (on the canvas in PowerPoint)
//   • in notes  — not on the canvas but present in the notes part
//   • missing   — in neither, i.e. genuinely lost by the export (a real bug)

import JSZip from "jszip";
import type { Deck } from "./deck-store";
import { collectStrings, isCovered, norm, OVERFLOW_HEADER } from "./reinterpret-design";

export type ExportSlideCoverage = {
  slideIndex: number;
  slideId: string;
  variantId: string;
  /** Lines the exported slide part actually renders. */
  covered: number;
  /** Lines that only exist in the exported speaker notes. */
  inNotes: number;
  /** Lines absent from both parts — export loss. */
  missing: string[];
  /** covered + inNotes + missing.length */
  total: number;
};

export type ExportCoverageReport = {
  slides: ExportSlideCoverage[];
  covered: number;
  inNotes: number;
  missing: number;
  total: number;
  /** True when nothing was lost: every line is on a slide or in its notes. */
  matches: boolean;
};

/** All `<a:t>` text runs in an OOXML part, joined. */
function textRuns(xml: string): string {
  const out: string[] = [];
  const re = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out
    .join(" ⋄ ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Numeric suffix of `ppt/slides/slide12.xml` → 12. */
function partIndex(name: string): number {
  const m = /(\d+)\.xml$/.exec(name);
  return m ? Number(m[1]) : 0;
}

/**
 * Source lines we expect to account for on a given deck slide: the copy the
 * layout kept (flattened from content) plus the overflow lines the designer
 * moved into notes. Together these are the original source bullets, so the
 * totals line up with the reviewer's coverage chip.
 */
function expectedLines(content: unknown, notes: string | undefined): {
  onSlide: string[];
  overflow: string[];
} {
  const onSlide = collectStrings(content).filter((s) => s.trim().length >= 4);
  const raw = notes ?? "";
  const idx = raw.indexOf(OVERFLOW_HEADER);
  const overflow =
    idx === -1
      ? []
      : raw
          .slice(idx + OVERFLOW_HEADER.length)
          .split("\n")
          .map((l) => l.replace(/^[•\-\s]+/, "").trim())
          .filter(Boolean);
  return { onSlide, overflow };
}

/**
 * Audit a generated .pptx against the deck it came from. Cheap: pure string
 * work over the zip entries, no rendering.
 */
export async function auditExportCoverage(
  deck: Deck,
  blob: Blob | ArrayBuffer,
): Promise<ExportCoverageReport> {
  const data = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  const zip = await JSZip.loadAsync(data);

  const slideParts = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => partIndex(a) - partIndex(b));
  const notesParts = new Map<number, string>();
  for (const name of Object.keys(zip.files)) {
    if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)) notesParts.set(partIndex(name), name);
  }

  const slides: ExportSlideCoverage[] = [];
  for (let i = 0; i < slideParts.length; i++) {
    const deckSlide = deck.slides[i];
    if (!deckSlide) continue;
    const slideXml = await zip.file(slideParts[i])!.async("string");
    const notesName = notesParts.get(partIndex(slideParts[i]));
    const notesXml = notesName ? await zip.file(notesName)!.async("string") : "";

    const slideHay = norm(textRuns(slideXml));
    const notesHay = norm(textRuns(notesXml));

    const { onSlide, overflow } = expectedLines(deckSlide.content, deckSlide.notes);
    let covered = 0;
    let inNotes = 0;
    const missing: string[] = [];
    for (const line of [...onSlide, ...overflow]) {
      if (isCovered(line, slideHay)) covered++;
      else if (notesHay && isCovered(line, notesHay)) inNotes++;
      else missing.push(line);
    }

    slides.push({
      slideIndex: i,
      slideId: deckSlide.id,
      variantId: deckSlide.variantId,
      covered,
      inNotes,
      missing,
      total: covered + inNotes + missing.length,
    });
  }

  const covered = slides.reduce((n, s) => n + s.covered, 0);
  const inNotes = slides.reduce((n, s) => n + s.inNotes, 0);
  const missing = slides.reduce((n, s) => n + s.missing.length, 0);
  return {
    slides,
    covered,
    inNotes,
    missing,
    total: covered + inNotes + missing,
    matches: missing === 0,
  };
}
