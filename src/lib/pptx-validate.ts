/**
 * Server-side validation of a generated .pptx, run before the download is
 * enabled.
 *
 * The exporter already reports what it *believes* it embedded. This module
 * proves it against the bytes: it opens the package, counts the real slide
 * parts, confirms every expected deck slide is present (in order, identified by
 * copy probes taken from its content), and verifies that every media reference
 * on every slide resolves to an entry that actually exists in `ppt/media/`.
 *
 * Pure and DOM-free: it takes bytes and returns a plain report, so it runs
 * inside the server route and in unit tests alike.
 */
import JSZip from "jszip";

export type ExpectedSlide = {
  slideId: string;
  variantId: string;
  /** Distinctive copy fragments expected on that slide (normalised). */
  probes: string[];
};

export type ExpectedManifest = {
  slideCount: number;
  slides: ExpectedSlide[];
  /** Minimum number of embedded media parts the deck should carry. */
  minMedia?: number;
  /**
   * True when the export path emits live text runs (editable / layered
   * fidelity). Raster-exact exports have no text, so probes become advisory.
   */
  expectTextRuns?: boolean;
};

export type PptxValidationIssue = {
  level: "error" | "warning";
  code:
    | "not-a-package"
    | "slide-count"
    | "slide-missing"
    | "slide-unidentified"
    | "media-missing"
    | "media-count"
    | "no-text";
  message: string;
};

export type PptxSlideCheck = {
  index: number;
  slideId: string;
  variantId: string;
  /** The slide part carries at least one text run. */
  hasText: boolean;
  probesFound: number;
  probesTotal: number;
  mediaRefs: number;
  missingMedia: string[];
};

export type PptxValidationReport = {
  ok: boolean;
  slideCount: number;
  expectedSlideCount: number;
  mediaCount: number;
  slides: PptxSlideCheck[];
  issues: PptxValidationIssue[];
};

/** Largest package we will open for validation. */
export const MAX_VALIDATE_BYTES = 120 * 1024 * 1024;

const XML_ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&",
};

function decodeXml(s: string): string {
  return s.replace(/&(lt|gt|quot|#39|amp);/g, (m) => XML_ENTITIES[m] ?? m);
}

/** All `<a:t>` runs of a part, joined and normalised for comparison. */
function partText(xml: string): string {
  const out: string[] = [];
  const re = /<a:t>([\s\S]*?)<\/a:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeXml(m[1] ?? ""));
  return normalise(out.join(" "));
}

export function normalise(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .trim()
    .toLowerCase();
}

function slideNumber(name: string): number {
  const m = /slide(\d+)\.xml$/.exec(name);
  return m ? Number(m[1]) : 0;
}

/** Media targets referenced by a slide's rels part, as `ppt/media/...` paths. */
function mediaTargets(relsXml: string): string[] {
  const out: string[] = [];
  const re = /Target="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(relsXml))) {
    const target = decodeXml(m[1] ?? "");
    if (!/media\//.test(target)) continue;
    out.push(target.replace(/^(\.\.\/)+/, "ppt/"));
  }
  return out;
}

export async function validatePptxBytes(
  bytes: Uint8Array,
  expected: ExpectedManifest,
): Promise<PptxValidationReport> {
  const issues: PptxValidationIssue[] = [];
  const slides: PptxSlideCheck[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return {
      ok: false,
      slideCount: 0,
      expectedSlideCount: expected.slideCount,
      mediaCount: 0,
      slides: [],
      issues: [
        {
          level: "error",
          code: "not-a-package",
          message: "The generated file is not a readable PowerPoint package.",
        },
      ],
    };
  }

  const names = Object.keys(zip.files).filter((n) => !zip.files[n]?.dir);
  if (!names.includes("[Content_Types].xml") || !names.includes("ppt/presentation.xml")) {
    issues.push({
      level: "error",
      code: "not-a-package",
      message: "The package is missing required PowerPoint parts.",
    });
  }

  const slideParts = names
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
  const mediaParts = new Set(names.filter((n) => n.startsWith("ppt/media/")));

  if (slideParts.length !== expected.slideCount) {
    issues.push({
      level: "error",
      code: "slide-count",
      message: `The file contains ${slideParts.length} slide${
        slideParts.length === 1 ? "" : "s"
      } but the deck has ${expected.slideCount}.`,
    });
  }

  for (let i = 0; i < expected.slides.length; i += 1) {
    const want = expected.slides[i]!;
    const part = slideParts[i];
    if (!part) {
      issues.push({
        level: "error",
        code: "slide-missing",
        message: `Slide ${i + 1} (${want.variantId}) is missing from the exported file.`,
      });
      slides.push({
        index: i,
        slideId: want.slideId,
        variantId: want.variantId,
        hasText: false,
        probesFound: 0,
        probesTotal: want.probes.length,
        mediaRefs: 0,
        missingMedia: [],
      });
      continue;
    }

    const xml = await zip.files[part]!.async("string");
    const text = partText(xml);
    const probesFound = want.probes.filter((p) => p && text.includes(normalise(p))).length;

    const relsName = `ppt/slides/_rels/${part.split("/").pop()}.rels`;
    const relsFile = zip.files[relsName];
    const refs = relsFile ? mediaTargets(await relsFile.async("string")) : [];
    const missingMedia = refs.filter((r) => !mediaParts.has(r));

    const check: PptxSlideCheck = {
      index: i,
      slideId: want.slideId,
      variantId: want.variantId,
      hasText: text.length > 0,
      probesFound,
      probesTotal: want.probes.length,
      mediaRefs: refs.length,
      missingMedia,
    };
    slides.push(check);

    if (missingMedia.length) {
      issues.push({
        level: "error",
        code: "media-missing",
        message: `Slide ${i + 1} (${want.variantId}) references ${
          missingMedia.length
        } image part${missingMedia.length === 1 ? "" : "s"} that is not in the file.`,
      });
    }

    if (want.probes.length > 0 && probesFound === 0) {
      issues.push({
        level: expected.expectTextRuns ? "error" : "warning",
        code: "slide-unidentified",
        message: `Slide ${i + 1} (${want.variantId}) could not be identified — none of its expected copy was found in the exported slide.`,
      });
    } else if (expected.expectTextRuns && !check.hasText) {
      issues.push({
        level: "warning",
        code: "no-text",
        message: `Slide ${i + 1} (${want.variantId}) exported without any text runs.`,
      });
    }
  }

  const minMedia = expected.minMedia ?? 0;
  if (mediaParts.size < minMedia) {
    issues.push({
      level: "error",
      code: "media-count",
      message: `The file embeds ${mediaParts.size} media asset${
        mediaParts.size === 1 ? "" : "s"
      } but at least ${minMedia} were expected.`,
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    slideCount: slideParts.length,
    expectedSlideCount: expected.slideCount,
    mediaCount: mediaParts.size,
    slides,
    issues,
  };
}
